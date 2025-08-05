
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      leadId, 
      tenantName, 
      tenantSlug, 
      subscriptionPlan, 
      adminEmail, 
      adminName 
    } = await req.json() as ConversionRequest;

    console.log('Converting lead to tenant:', { leadId, tenantName, tenantSlug, adminEmail });

    // Validate slug availability first
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .single();

    if (existingTenant) {
      return new Response(
        JSON.stringify({ 
          error: `Tenant slug '${tenantSlug}' is already taken. Please choose a different slug.`,
          code: 'SLUG_TAKEN' 
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get lead details
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      throw new Error(`Lead not found: ${leadError?.message}`);
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-12) + 'Aa1!';

    // Create user account
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: adminName,
        role: 'tenant_admin'
      }
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      throw new Error(`Failed to create user: ${authError.message}`);
    }

    const userId = authUser.user?.id;
    if (!userId) {
      throw new Error('Failed to get user ID from auth creation');
    }

    console.log('Created auth user:', userId);

    // Create tenant with proper structure
    const tenantData = {
      name: tenantName,
      slug: tenantSlug,
      type: 'agri_company',
      status: 'trial',
      subscription_plan: subscriptionPlan,
      owner_name: adminName,
      owner_email: adminEmail,
      trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days trial
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
        conversion_date: new Date().toISOString()
      }
    };

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert(tenantData)
      .select()
      .single();

    if (tenantError) {
      console.error('Tenant creation error:', tenantError);
      
      // Clean up user if tenant creation fails
      await supabase.auth.admin.deleteUser(userId);
      
      throw new Error(`Failed to create tenant: ${tenantError.message}`);
    }

    console.log('Created tenant:', tenant.id);

    // Create user_tenants relationship
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
      // Don't fail the entire operation for this
    }

    // Send welcome email using the centralized email service
    const loginUrl = `${Deno.env.get('SITE_URL') || 'https://yourapp.com'}/auth`;
    
    const { data: emailData, error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: adminEmail,
        subject: `Welcome to ${tenantName} - Your Account is Ready!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Welcome to ${tenantName}!</h1>
            <p>Dear ${adminName},</p>
            <p>Congratulations! Your lead has been converted to a tenant account. You can now access your dedicated tenant dashboard.</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3>Login Credentials:</h3>
              <p><strong>Email:</strong> ${adminEmail}</p>
              <p><strong>Temporary Password:</strong> ${tempPassword}</p>
              <p><strong>Tenant:</strong> ${tenantName}</p>
            </div>
            
            <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
            
            <div style="margin: 30px 0;">
              <a href="${loginUrl}" 
                 style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Login to Your Account
              </a>
            </div>
            
            <p>If you have any questions, please don't hesitate to contact our support team.</p>
            
            <p>Best regards,<br>The KisanShaktiAI Team</p>
          </div>
        `,
        text: `Welcome to ${tenantName}! Dear ${adminName}, Congratulations! Your lead has been converted to a tenant account. Login Details: Email: ${adminEmail}, Temporary Password: ${tempPassword}, Tenant: ${tenantName}. Login at: ${loginUrl}`,
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
    } else {
      console.log('Welcome email sent successfully');
    }

    // Update lead status
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
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Lead converted to tenant successfully',
        tenantId: tenant.id,
        userId: userId,
        tenantSlug: tenantSlug
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Lead conversion error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
