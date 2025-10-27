
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

      // CRITICAL: Validate that userId exists before proceeding
      if (!userId) {
        throw new Error('User registration succeeded but no userId was returned');
      }

      // Verify the user exists in auth.users
      console.log('Verifying user exists in auth.users...');
      const { data: verifyUser, error: verifyError } = await supabase.auth.admin.getUserById(userId);
      
      if (verifyError || !verifyUser.user) {
        console.error('User verification failed:', verifyError);
        throw new Error(`User does not exist in auth.users after registration: ${verifyError?.message || 'User not found'}`);
      }
      
      if (verifyUser.user.email !== adminEmail) {
        throw new Error(`User email mismatch: expected ${adminEmail}, got ${verifyUser.user.email}`);
      }
      
      console.log('User verified in auth.users:', verifyUser.user.email);

      // Use the global manage-user-tenant function to create the relationship
      if (userId) {
        console.log('Creating user-tenant relationship using global manage-user-tenant function...');
        console.log('Using newly created userId:', userId);
        
        // CRITICAL: Use service role key to bypass auth checks in manage-user-tenant
        // This ensures we use the NEW user's ID, not the calling admin's ID
        const relationshipResponse = await supabase.functions.invoke('manage-user-tenant', {
          body: {
            user_id: userId, // This is the newly created user's ID
            tenant_id: tenantId,
            role: 'tenant_admin',
            is_active: true,
            metadata: {
              created_via: 'lead_conversion',
              converted_from_lead: leadId,
              conversion_date: new Date().toISOString(),
              admin_email: adminEmail,
              admin_name: adminName
            },
            operation: 'upsert'
          },
          headers: {
            // Use service role key to bypass authorization checks
            'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
            'x-request-id': `lead-conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            'x-correlation-id': `lead-${leadId}-tenant-${tenantId}`
          }
        });

        if (relationshipResponse.error) {
          console.error('User-tenant relationship creation failed:', relationshipResponse.error);
          throw new Error(`Failed to create user-tenant relationship: ${relationshipResponse.error.message}`);
        }

        const relationshipData = relationshipResponse.data;
        if (!relationshipData.success) {
          console.error('User-tenant relationship creation failed:', relationshipData.error);
          throw new Error(`Failed to create user-tenant relationship: ${relationshipData.error}`);
        }

        userTenantCreated = true;
        console.log('User-tenant relationship created successfully via global function:', relationshipData);
        
        // Final verification: Check that user_tenants record was created correctly
        console.log('Verifying user-tenant relationship...');
        const { data: verifyRelationship, error: verifyRelError } = await supabase
          .from('user_tenants')
          .select('user_id, tenant_id, role')
          .eq('user_id', userId)
          .eq('tenant_id', tenantId)
          .single();
        
        if (verifyRelError || !verifyRelationship) {
          throw new Error('User-tenant relationship verification failed - record not found in database');
        }
        
        if (verifyRelationship.user_id !== userId) {
          throw new Error(`User-tenant relationship has wrong user_id: expected ${userId}, got ${verifyRelationship.user_id}`);
        }
        
        console.log('User-tenant relationship verified:', verifyRelationship);
      }

    } catch (error) {
      console.error('Error in user registration or relationship creation:', error);
      
      // ROLLBACK: Delete the tenant and revert lead status
      console.log('Rolling back tenant creation due to user/relationship error...');
      
      try {
        // Delete tenant
        await supabase
          .from('tenants')
          .delete()
          .eq('id', tenantId);
        
        // Revert lead status
        await supabase
          .from('leads')
          .update({ 
            status: 'qualified', 
            converted_tenant_id: null, 
            converted_at: null 
          })
          .eq('id', leadId);
        
        console.log('Rollback completed successfully');
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
      
      const response: ConversionResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to register user or create relationship',
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

    // Run diagnostics to verify complete conversion
    console.log('Running conversion diagnostics...');
    try {
      const { data: diagnostics, error: diagError } = await supabase.rpc(
        'get_conversion_diagnostics',
        { p_lead_id: leadId }
      );
      
      if (!diagError && diagnostics) {
        console.log('Conversion diagnostics:', JSON.stringify(diagnostics, null, 2));
      }
    } catch (diagError) {
      console.warn('Diagnostics failed (non-critical):', diagError);
    }

    // Return comprehensive success response
    const response: ConversionResponse = {
      success: true,
      message: 'Lead converted to tenant successfully with user registration and relationship creation via global function',
      tenantId: tenantId,
      tenant_id: tenantId,
      userId: userId,
      tenantSlug: tenantSlug,
      tempPassword: isRecovery && tempPassword === 'recovery-no-password' ? undefined : tempPassword,
      isRecovery: isRecovery,
      userTenantCreated: userTenantCreated
    };

    console.log('Conversion completed successfully using global manage-user-tenant function');
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
