
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
  tenant_id?: string; // Keep both for compatibility
  userId?: string;
  tenantSlug?: string;
  tempPassword?: string;
  isRecovery?: boolean;
  userTenantCreated?: boolean;
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
    const validPlans = ['Kisan_Basic', 'Shakti_Growth', 'AI_Enterprise', 'Custom_Enterprise'];
    const normalizedPlan = validPlans.includes(subscriptionPlan) ? subscriptionPlan : 'Kisan_Basic';

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

    // Always ensure user account and user-tenant relationship exist
    let userId: string | undefined;
    let userTenantCreated = false;

    try {
      // Check if user exists in auth
      const { data: existingUser, error: userCheckError } = await supabase.auth.admin.getUserByEmail(adminEmail);
      
      if (!existingUser?.user || userCheckError) {
        // Create new user with proper metadata
        console.log('Creating new auth user...');
        const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
          email: adminEmail,
          password: tempPassword !== 'recovery-no-password' ? tempPassword : 'TempPass123!',
          email_confirm: true,
          user_metadata: {
            full_name: adminName,
            tenant_id: tenantId,
            role: 'tenant_admin'
          }
        });

        if (createUserError) {
          console.error('Failed to create auth user:', createUserError);
          throw new Error(`Failed to create user: ${createUserError.message}`);
        } else {
          userId = newUser.user?.id;
          console.log('Created auth user:', userId);
        }
      } else {
        userId = existingUser.user?.id;
        console.log('Using existing auth user:', userId);
        
        // Update existing user's metadata to include tenant info
        if (userId) {
          const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
            user_metadata: {
              full_name: adminName,
              tenant_id: tenantId,
              role: 'tenant_admin'
            }
          });

          if (updateError) {
            console.error('Failed to update user metadata:', updateError);
          }
        }
      }

      // Ensure user_tenants relationship exists
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
        } else {
          console.error('Error checking user-tenant relationship:', relationCheckError);
        }

        // Final validation: Ensure relationship exists
        const { data: finalCheck, error: finalCheckError } = await supabase
          .from('user_tenants')
          .select('id')
          .eq('user_id', userId)
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .single();

        if (!finalCheck || finalCheckError) {
          console.error('User-tenant relationship validation failed:', finalCheckError);
          throw new Error('Failed to establish user-tenant relationship');
        }
      }

    } catch (error) {
      console.error('Error in user/relationship creation:', error);
      
      const response: ConversionResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set up user access',
        code: 'USER_SETUP_ERROR'
      };
      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Send welcome email only for new conversions
    if (!isRecovery && tempPassword !== 'recovery-no-password') {
      try {
        const loginUrl = `${Deno.env.get('SITE_URL') || 'https://yourapp.com'}/auth`;
        
        console.log('Sending welcome email...');
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
              tenant_id: tenantId,
              lead_id: leadId,
              user_id: userId
            }
          }
        });

        if (emailError) {
          console.error('Failed to send welcome email:', emailError);
        } else {
          console.log('Welcome email sent successfully');
        }
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Don't fail the conversion for email errors
      }
    }

    // Return comprehensive success response with both tenantId and tenant_id for compatibility
    const response: ConversionResponse = {
      success: true,
      message: conversionResult.message || 'Lead converted to tenant successfully',
      tenantId: tenantId,
      tenant_id: tenantId, // Include both for compatibility
      userId: userId,
      tenantSlug: tenantSlug,
      tempPassword: isRecovery && tempPassword === 'recovery-no-password' ? undefined : tempPassword,
      isRecovery: isRecovery,
      userTenantCreated: userTenantCreated
    };

    console.log('Conversion completed successfully with user access verified');
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
