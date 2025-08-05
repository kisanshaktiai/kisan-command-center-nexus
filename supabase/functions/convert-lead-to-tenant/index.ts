
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
    if (!leadId || !tenantName || !tenantSlug || !adminEmail) {
      const response: ConversionResponse = {
        success: false,
        error: 'Missing required parameters: leadId, tenantName, tenantSlug, and adminEmail are required',
        code: 'VALIDATION_ERROR'
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if lead exists and is in correct status
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error('Lead fetch error:', leadError);
      const response: ConversionResponse = {
        success: false,
        error: `Lead not found or inaccessible: ${leadError?.message || 'Unknown error'}`,
        code: 'LEAD_NOT_FOUND'
      };
      return new Response(JSON.stringify(response), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if lead is already converted
    if (lead.status === 'converted' && lead.converted_tenant_id) {
      const response: ConversionResponse = {
        success: false,
        error: `Lead has already been converted to tenant ID: ${lead.converted_tenant_id}`,
        code: 'LEAD_ALREADY_CONVERTED'
      };
      return new Response(JSON.stringify(response), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate slug availability - handle conflicts gracefully
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id, name, status')
      .eq('slug', tenantSlug)
      .single();

    if (existingTenant) {
      console.log('Slug conflict detected:', { slug: tenantSlug, existingTenant });
      const response: ConversionResponse = {
        success: false,
        error: `Tenant slug '${tenantSlug}' is already taken by tenant: ${existingTenant.name} (ID: ${existingTenant.id})`,
        code: 'SLUG_CONFLICT'
      };
      return new Response(JSON.stringify(response), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate secure temporary password
    const tempPassword = Math.random().toString(36).slice(-12) + 'Aa1!';

    // Create user account with comprehensive error handling
    let authUser;
    try {
      const { data: userData, error: authError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: adminName,
          role: 'tenant_admin',
          tenant_name: tenantName
        }
      });

      if (authError) {
        console.error('Auth user creation error:', authError);
        throw new Error(`Failed to create user account: ${authError.message}`);
      }

      authUser = userData;
    } catch (error) {
      console.error('User creation failed:', error);
      const response: ConversionResponse = {
        success: false,
        error: `Failed to create user account: ${error.message}`,
        code: 'USER_CREATION_FAILED'
      };
      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userId = authUser.user?.id;
    if (!userId) {
      const response: ConversionResponse = {
        success: false,
        error: 'Failed to get user ID from auth creation',
        code: 'USER_ID_MISSING'
      };
      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Created auth user:', userId);

    // Create tenant with proper error handling and conflict resolution
    const tenantData = {
      name: tenantName,
      slug: tenantSlug,
      type: 'agri_company',
      status: 'trial',
      subscription_plan: subscriptionPlan || 'Kisan_Basic',
      owner_name: adminName,
      owner_email: adminEmail,
      trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      settings: {
        features: {
          basic_analytics: true,
          farmer_management: true,
          communication_tools: true
        },
        limits: {
          max_farmers: subscriptionPlan === 'Kisan_Basic' ? 1000 : 5000,
          max_dealers: subscriptionPlan === 'Kisan_Basic' ? 50 : 200,
          max_products: subscriptionPlan === 'Kisan_Basic' ? 100 : 500
        }
      },
      metadata: {
        converted_from_lead: leadId,
        conversion_date: new Date().toISOString(),
        created_by_function: 'convert-lead-to-tenant'
      }
    };

    let tenant;
    try {
      const { data: tenantResult, error: tenantError } = await supabase
        .from('tenants')
        .insert(tenantData)
        .select()
        .single();

      if (tenantError) {
        console.error('Tenant creation error:', tenantError);
        
        // Clean up user if tenant creation fails
        await supabase.auth.admin.deleteUser(userId);
        
        // Handle specific database constraint errors
        if (tenantError.code === '23505') { // Unique constraint violation
          const response: ConversionResponse = {
            success: false,
            error: `Tenant with slug '${tenantSlug}' or name '${tenantName}' already exists`,
            code: 'TENANT_EXISTS'
          };
          return new Response(JSON.stringify(response), {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        throw new Error(`Failed to create tenant: ${tenantError.message}`);
      }

      tenant = tenantResult;
    } catch (error) {
      console.error('Tenant creation failed:', error);
      
      // Clean up user
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (cleanupError) {
        console.error('Failed to cleanup user after tenant creation failure:', cleanupError);
      }

      const response: ConversionResponse = {
        success: false,
        error: `Failed to create tenant: ${error.message}`,
        code: 'TENANT_CREATION_FAILED'
      };
      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Created tenant:', tenant.id);

    // Create user_tenants relationship with error handling
    try {
      const { error: userTenantError } = await supabase
        .from('user_tenants')
        .insert({
          user_id: userId,
          tenant_id: tenant.id,
          role: 'tenant_admin',
          is_active: true
        });

      if (userTenantError) {
        console.error('User tenant relationship error:', userTenantError);
        // Don't fail the entire operation for this, but log it
      }
    } catch (error) {
      console.error('Failed to create user-tenant relationship:', error);
      // Don't fail the entire operation
    }

    // Send welcome email using the centralized email service
    try {
      const loginUrl = `${Deno.env.get('SITE_URL') || 'https://yourapp.com'}/auth`;
      
      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          to: adminEmail,
          subject: `Welcome to ${tenantName} - Your Account is Ready!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1>Welcome to ${tenantName}!</h1>
              <p>Dear ${adminName},</p>
              <p>Congratulations! Your lead has been converted to a tenant account.</p>
              
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3>Login Credentials:</h3>
                <p><strong>Email:</strong> ${adminEmail}</p>
                <p><strong>Temporary Password:</strong> ${tempPassword}</p>
                <p><strong>Tenant:</strong> ${tenantName}</p>
              </div>
              
              <p><strong>Important:</strong> Please change your password after your first login.</p>
              
              <div style="margin: 30px 0;">
                <a href="${loginUrl}" 
                   style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Login to Your Account
                </a>
              </div>
              
              <p>Best regards,<br>The KisanShaktiAI Team</p>
            </div>
          `,
          text: `Welcome to ${tenantName}! Login Details: Email: ${adminEmail}, Password: ${tempPassword}. Login at: ${loginUrl}`,
          metadata: {
            type: 'lead_conversion',
            tenant_id: tenant.id,
            lead_id: leadId,
            user_id: userId
          }
        }
      });

      if (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the conversion for email issues
      } else {
        console.log('Welcome email sent successfully');
      }
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail the conversion for email issues
    }

    // Update lead status with comprehensive error handling
    try {
      const { error: leadUpdateError } = await supabase
        .from('leads')
        .update({
          status: 'converted',
          converted_tenant_id: tenant.id,
          converted_at: new Date().toISOString(),
          notes: `Converted to tenant: ${tenantName}. Welcome email sent to ${adminEmail}.`
        })
        .eq('id', leadId);

      if (leadUpdateError) {
        console.error('Failed to update lead status:', leadUpdateError);
        // Don't fail the conversion for lead update issues
      }
    } catch (error) {
      console.error('Lead update failed:', error);
      // Don't fail the conversion
    }

    // Return success response with all necessary data
    const response: ConversionResponse = {
      success: true,
      message: 'Lead converted to tenant successfully',
      tenantId: tenant.id,
      userId: userId,
      tenantSlug: tenantSlug,
      tempPassword: tempPassword
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Lead conversion error:', error);
    
    // Always return a structured JSON response
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
