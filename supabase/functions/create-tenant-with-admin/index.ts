
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateTenantRequest {
  name: string;
  slug: string;
  type: string;
  subscription_plan: string;
  owner_email: string;
  owner_name: string;
  metadata?: Record<string, any>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    // Get service role client
    const supabaseServiceRole = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Get regular client for current user verification
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader! },
        },
      }
    );

    // Verify current user is admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if user is admin
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (adminError || !adminUser || !adminUser.is_active) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const requestData: CreateTenantRequest = await req.json();

    // Validate required fields
    if (!requestData.name?.trim() || !requestData.slug?.trim() || !requestData.owner_email?.trim() || !requestData.owner_name?.trim()) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check slug availability
    const { data: existingTenant } = await supabaseServiceRole
      .from('tenants')
      .select('id')
      .eq('slug', requestData.slug)
      .single();

    if (existingTenant) {
      return new Response(JSON.stringify({ error: "Slug already exists" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Generate temporary password
    const generateTemporaryPassword = (): string => {
      const length = 12;
      const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
      let password = '';
      
      // Ensure at least one of each type
      password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
      password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
      password += '0123456789'[Math.floor(Math.random() * 10)];
      password += '!@#$%^&*'[Math.floor(Math.random() * 8)];
      
      // Fill the rest randomly
      for (let i = 4; i < length; i++) {
        password += charset[Math.floor(Math.random() * charset.length)];
      }
      
      // Shuffle the password
      return password.split('').sort(() => 0.5 - Math.random()).join('');
    };

    const tempPassword = generateTemporaryPassword();

    // Create admin user in auth.users using service role
    const { data: authUser, error: authError } = await supabaseServiceRole.auth.admin.createUser({
      email: requestData.owner_email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: requestData.owner_name,
        tenant_slug: requestData.slug,
        role: 'tenant_admin'
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return new Response(JSON.stringify({ error: `Failed to create admin user: ${authError.message}` }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Create tenant
    const { data: tenant, error: tenantError } = await supabaseServiceRole
      .from('tenants')
      .insert({
        name: requestData.name,
        slug: requestData.slug,
        type: requestData.type,
        subscription_plan: requestData.subscription_plan,
        owner_email: requestData.owner_email,
        owner_name: requestData.owner_name,
        metadata: {
          ...requestData.metadata,
          admin_user_id: authUser.user.id,
          created_via: 'manual_creation'
        },
        status: 'trial',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Error creating tenant:', tenantError);
      // Clean up auth user if tenant creation fails
      await supabaseServiceRole.auth.admin.deleteUser(authUser.user.id);
      return new Response(JSON.stringify({ error: tenantError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Create user_tenants relationship
    const { error: relationError } = await supabaseServiceRole
      .from('user_tenants')
      .insert({
        user_id: authUser.user.id,
        tenant_id: tenant.id,
        role: 'tenant_owner',
        is_active: true,
        joined_at: new Date().toISOString()
      });

    if (relationError) {
      console.error('Error creating user-tenant relation:', relationError);
    }

    // Send welcome email
    try {
      const loginUrl = `${req.headers.get('origin') || 'https://your-domain.com'}/auth`;
      
      const emailResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: requestData.owner_email,
          subject: `Welcome to ${requestData.name} - Your Account is Ready!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Welcome to ${requestData.name}!</h2>
              <p>Hello ${requestData.owner_name},</p>
              <p>Your tenant account has been successfully created. Here are your login credentials:</p>
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Email:</strong> ${requestData.owner_email}</p>
                <p><strong>Temporary Password:</strong> ${tempPassword}</p>
                <p><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
              </div>
              <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
              <p>Best regards,<br>Your Team</p>
            </div>
          `,
          metadata: {
            tenantId: tenant.id,
            userId: authUser.user.id
          }
        }),
      });

      if (!emailResponse.ok) {
        console.error('Failed to send welcome email:', await emailResponse.text());
      }
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      tenant: tenant,
      message: 'Tenant created successfully with admin user',
      adminEmail: requestData.owner_email
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in create-tenant-with-admin:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Failed to create tenant" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
