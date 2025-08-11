
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ConversionRequest {
  leadId: string;
  tenantName: string;
  tenantSlug: string;
  subscriptionPlan: string;
  adminEmail: string;
  adminName: string;
}

interface ConversionResponse {
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
  tenantId?: string;
  userId?: string;
  tenantSlug?: string;
  tempPassword?: string;
  isRecovery?: boolean;
  userTenantCreated?: boolean;
  tenant_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestBody = await req.json() as ConversionRequest;
    const { 
      leadId, 
      tenantName, 
      tenantSlug, 
      subscriptionPlan, 
      adminEmail, 
      adminName 
    } = requestBody;

    console.log('Converting lead to tenant:', { leadId, tenantName, tenantSlug, adminEmail });

    // Validate input parameters
    if (!leadId || !tenantName || !tenantSlug || !adminEmail || !adminName) {
      const response: ConversionResponse = {
        success: false,
        error: 'Missing required parameters: leadId, tenantName, tenantSlug, adminEmail, and adminName are required',
        code: 'VALIDATION_ERROR'
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate subscription plan enum
    const validPlans = ['Kisan_Basic', 'Shakti_Growth', 'AI_Enterprise', 'custom'];
    const normalizedPlan = validPlans.includes(subscriptionPlan) ? subscriptionPlan : 'Kisan_Basic';

    // Pre-conversion validation: Check if lead exists and is qualified
    const { data: leadData, error: leadFetchError } = await supabase
      .from('leads')
      .select('id, status, contact_name, email, converted_tenant_id')
      .eq('id', leadId)
      .single();

    if (leadFetchError || !leadData) {
      console.error('Lead fetch error:', leadFetchError);
      const response: ConversionResponse = {
        success: false,
        error: 'Lead not found',
        code: 'LEAD_NOT_FOUND'
      };
      return new Response(JSON.stringify(response), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (leadData.status !== 'qualified') {
      console.error('Lead not qualified:', leadData.status);
      const response: ConversionResponse = {
        success: false,
        error: `Lead must be qualified before conversion. Current status: ${leadData.status}`,
        code: 'LEAD_NOT_QUALIFIED'
      };
      return new Response(JSON.stringify(response), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (leadData.converted_tenant_id) {
      console.error('Lead already converted:', leadData.converted_tenant_id);
      const response: ConversionResponse = {
        success: false,
        error: 'Lead has already been converted to a tenant',
        code: 'LEAD_ALREADY_CONVERTED'
      };
      return new Response(JSON.stringify(response), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if tenant slug is already taken
    const { data: existingTenant, error: slugCheckError } = await supabase
      .from('tenants')
      .select('id, slug')
      .eq('slug', tenantSlug)
      .single();

    if (existingTenant && !slugCheckError) {
      console.error('Tenant slug already exists:', tenantSlug);
      const response: ConversionResponse = {
        success: false,
        error: `Tenant slug '${tenantSlug}' is already taken`,
        code: 'SLUG_CONFLICT'
      };
      return new Response(JSON.stringify(response), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Calling enhanced conversion function...');
    const { data: conversionResult, error: conversionError } = await supabase.rpc(
      'convert_lead_to_tenant_secure',
      {
        p_lead_id: leadId,
        p_tenant_name: tenantName,
        p_tenant_slug: tenantSlug,
        p_subscription_plan: normalizedPlan,
        p_admin_email: adminEmail,
        p_admin_name: adminName
      }
    );

    if (conversionError) {
      console.error('Database function error:', conversionError);
      const response: ConversionResponse = {
        success: false,
        error: `Database operation failed: ${conversionError.message}`,
        code: 'DATABASE_ERROR'
      };
      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!conversionResult) {
      console.error('No result from conversion function');
      const response: ConversionResponse = {
        success: false,
        error: 'No response from conversion operation',
        code: 'NO_RESPONSE'
      };
      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Conversion function result:', conversionResult);

    // Check if the database function returned an error
    if (!conversionResult.success) {
      console.error('Conversion failed:', conversionResult);
      
      let statusCode = 400;
      switch (conversionResult.code) {
        case 'LEAD_NOT_FOUND':
          statusCode = 404;
          break;
        case 'LEAD_NOT_QUALIFIED':
          statusCode = 422;
          break;
        case 'LEAD_ALREADY_CONVERTED':
        case 'SLUG_CONFLICT':
          statusCode = 409;
          break;
        case 'INTERNAL_ERROR':
          statusCode = 500;
          break;
        default:
          statusCode = 400;
      }

      const response: ConversionResponse = {
        success: false,
        error: conversionResult.error,
        code: conversionResult.code
      };
      return new Response(JSON.stringify(response), {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const tenantId = conversionResult.tenant_id;
    const tempPassword = conversionResult.temp_password;
    const isRecovery = conversionResult.is_recovery || false;

    console.log('Tenant created successfully:', tenantId, isRecovery ? '(recovery)' : '(new)');

    // Post-conversion verification: Ensure tenant was created
    const { data: createdTenant, error: tenantVerifyError } = await supabase
      .from('tenants')
      .select('id, name, slug, status')
      .eq('id', tenantId)
      .single();

    if (tenantVerifyError || !createdTenant) {
      console.error('Tenant verification failed:', tenantVerifyError);
      
      // Attempt to rollback lead status
      await supabase
        .from('leads')
        .update({ 
          status: 'qualified', 
          converted_tenant_id: null, 
          converted_at: null 
        })
        .eq('id', leadId);

      const response: ConversionResponse = {
        success: false,
        error: 'Tenant creation verification failed',
        code: 'TENANT_VERIFICATION_FAILED'
      };
      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Use the new user registration service
    let userId: string | undefined;
    let userTenantCreated = false;

    try {
      console.log('Registering user with welcome email...');
      
      const registrationResponse = await supabase.functions.invoke('register-user-with-welcome', {
        body: {
          email: adminEmail,
          fullName: adminName,
          password: tempPassword !== 'recovery-no-password' ? tempPassword : undefined,
          tenantId: tenantId,
          role: 'tenant_admin',
          metadata: {
            converted_from_lead: leadId,
            conversion_date: new Date().toISOString()
          },
          sendWelcomeEmail: !isRecovery && tempPassword !== 'recovery-no-password',
          welcomeEmailData: {
            tenantName: tenantName,
            loginUrl: `${Deno.env.get('SITE_URL') || 'https://yourapp.com'}/auth`,
            customMessage: 'Your lead has been successfully converted to a tenant account.'
          }
        }
      });

      if (registrationResponse.error) {
        console.error('User registration failed:', registrationResponse.error);
        throw new Error(`User registration failed: ${registrationResponse.error.message || registrationResponse.error}`);
      }

      const registrationData = registrationResponse.data;
      if (!registrationData.success) {
        throw new Error(`User registration failed: ${registrationData.error}`);
      }

      userId = registrationData.userId;
      console.log('User registered successfully:', userId, registrationData.isNewUser ? '(new user)' : '(existing user)');

      // Ensure user-tenant relationship exists
      if (userId) {
        const { data: existingRelation, error: relationCheckError } = await supabase
          .from('user_tenants')
          .select('id')
          .eq('user_id', userId)
          .eq('tenant_id', tenantId)
          .single();

        if (!existingRelation && !relationCheckError) {
          console.log('Creating user-tenant relationship...');
          const { error: tenantUserError } = await supabase
            .from('user_tenants')
            .insert({
              user_id: userId,
              tenant_id: tenantId,
              role: 'tenant_admin',
              is_active: true
            });

          if (tenantUserError) {
            console.error('Failed to create tenant user relationship:', tenantUserError);
            throw new Error(`Failed to create user-tenant relationship: ${tenantUserError.message}`);
          } else {
            userTenantCreated = true;
            console.log('Created user-tenant relationship successfully');
          }
        } else if (existingRelation) {
          console.log('User-tenant relationship already exists');
          userTenantCreated = true;
        }
      }

    } catch (error) {
      console.error('Error in user registration:', error);
      
      const response: ConversionResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to register user',
        code: 'USER_REGISTRATION_ERROR'
      };
      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify lead status was updated correctly
    const { data: updatedLead, error: leadVerifyError } = await supabase
      .from('leads')
      .select('id, status, converted_tenant_id, converted_at')
      .eq('id', leadId)
      .single();

    if (leadVerifyError || !updatedLead || updatedLead.status !== 'converted' || updatedLead.converted_tenant_id !== tenantId) {
      console.error('Lead status verification failed:', leadVerifyError, updatedLead);
      
      const response: ConversionResponse = {
        success: false,
        error: 'Lead status verification failed',
        code: 'LEAD_STATUS_VERIFICATION_FAILED'
      };
      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Return comprehensive success response
    const response: ConversionResponse = {
      success: true,
      message: conversionResult.message || 'Lead converted to tenant successfully with user registration',
      tenantId: tenantId,
      tenant_id: tenantId,
      userId: userId,
      tenantSlug: tenantSlug,
      tempPassword: isRecovery && tempPassword === 'recovery-no-password' ? undefined : tempPassword,
      isRecovery: isRecovery,
      userTenantCreated: userTenantCreated
    };

    console.log('Conversion completed successfully with user registration');
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Lead conversion error:', error);
    
    const response: ConversionResponse = {
      success: false,
      error: error.message || 'Unknown error occurred during conversion',
      code: 'INTERNAL_ERROR'
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
