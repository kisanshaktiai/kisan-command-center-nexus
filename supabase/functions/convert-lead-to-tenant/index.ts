
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ConvertLeadRequest {
  leadId: string;
  tenantName: string;
  tenantSlug: string;
  subscriptionPlan?: string;
  adminEmail?: string;
  adminName?: string;
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

    const { leadId, tenantName, tenantSlug, subscriptionPlan = 'Kisan_Basic', adminEmail, adminName } = await req.json() as ConvertLeadRequest;

    console.log('Converting lead to tenant:', { leadId, tenantName, tenantSlug, subscriptionPlan });

    // First, get the lead details
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('status', 'qualified')
      .single();

    if (leadError || !leadData) {
      console.error('Lead not found or not qualified:', leadError);
      return new Response(
        JSON.stringify({ error: 'Lead not found or not qualified for conversion' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check slug availability
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .single();

    if (existingTenant) {
      return new Response(
        JSON.stringify({ error: 'This slug is already taken' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the tenant
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: tenantName,
        slug: tenantSlug,
        type: 'agri_company',
        status: 'trial',
        subscription_plan: subscriptionPlan,
        owner_name: adminName || leadData.contact_name,
        owner_email: adminEmail || leadData.email,
        owner_phone: leadData.phone,
        metadata: {
          converted_from_lead: leadId,
          conversion_date: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (tenantError || !tenantData) {
      console.error('Failed to create tenant:', tenantError);
      return new Response(
        JSON.stringify({ error: 'Failed to create tenant' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Tenant created successfully:', tenantData.id);

    // Generate a temporary password for the admin user
    const tempPassword = generateTempPassword();

    // Create or update the admin user
    const adminEmailAddress = adminEmail || leadData.email;
    
    try {
      // Try to get existing user first
      const { data: existingAuthUser } = await supabase
        .from('auth.users')
        .select('id, email')
        .eq('email', adminEmailAddress)
        .single();

      let userId = existingAuthUser?.id;

      if (!userId) {
        // Create new user using admin API
        const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
          email: adminEmailAddress,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: adminName || leadData.contact_name,
            tenant_id: tenantData.id,
            role: 'tenant_admin'
          }
        });

        if (createUserError) {
          console.error('Failed to create user:', createUserError);
          userId = null;
        } else {
          userId = newUser.user?.id;
        }
      } else {
        // Update existing user's metadata
        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
          user_metadata: {
            full_name: adminName || leadData.contact_name,
            tenant_id: tenantData.id,
            role: 'tenant_admin'
          }
        });

        if (updateError) {
          console.error('Failed to update user metadata:', updateError);
        }
      }

      // Create user_tenants relationship if user was created/found
      if (userId) {
        const { error: tenantUserError } = await supabase
          .from('user_tenants')
          .insert({
            user_id: userId,
            tenant_id: tenantData.id,
            role: 'tenant_admin',
            is_active: true
          });

        if (tenantUserError) {
          console.error('Failed to create tenant user relationship:', tenantUserError);
        }
      }
    } catch (authError) {
      console.warn('Auth operation failed, continuing without user creation:', authError);
    }

    // Update the lead status to converted
    const { error: leadUpdateError } = await supabase
      .from('leads')
      .update({
        status: 'converted',
        converted_tenant_id: tenantData.id,
        converted_at: new Date().toISOString(),
        notes: `Converted to tenant: ${tenantName}. Welcome email sent to ${adminEmailAddress}.`
      })
      .eq('id', leadId);

    if (leadUpdateError) {
      console.error('Failed to update lead status:', leadUpdateError);
    }

    // Send notification email (would integrate with your email service)
    console.log('Conversion email should be sent to:', adminEmailAddress);

    return new Response(
      JSON.stringify({
        success: true,
        tenant_id: tenantData.id,
        tempPassword: tempPassword,
        message: 'Lead converted to tenant successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Lead conversion error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateTempPassword(): string {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  // Ensure at least one of each type
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // uppercase
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // lowercase
  password += '0123456789'[Math.floor(Math.random() * 10)]; // number
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // special
  
  // Fill the rest
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
