
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
    console.log("Creating tenant with data:", { ...requestData, owner_email: requestData.owner_email });

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

    // Check if user already exists in auth.users
    const { data: existingAuthUser } = await supabaseServiceRole.auth.admin.listUsers();
    const userExists = existingAuthUser.users?.find(u => u.email === requestData.owner_email);

    let authUser;
    let tempPassword = '';
    let isNewUser = false;

    if (userExists) {
      console.log("User already exists in auth.users:", requestData.owner_email);
      authUser = { user: userExists };
    } else {
      console.log("Creating new user in auth.users:", requestData.owner_email);
      isNewUser = true;

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

      tempPassword = generateTemporaryPassword();

      // Create admin user in auth.users using service role
      const createUserResult = await supabaseServiceRole.auth.admin.createUser({
        email: requestData.owner_email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: requestData.owner_name,
          tenant_slug: requestData.slug,
          role: 'tenant_admin'
        }
      });

      if (createUserResult.error) {
        console.error('Error creating auth user:', createUserResult.error);
        return new Response(JSON.stringify({ error: `Failed to create admin user: ${createUserResult.error.message}` }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      authUser = createUserResult;
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
        subdomain: requestData.slug,
        metadata: {
          ...requestData.metadata,
          admin_user_id: authUser.user.id,
          created_via: 'manual_creation',
          is_new_user: isNewUser
        },
        status: 'trial',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Error creating tenant:', tenantError);
      // Clean up auth user if tenant creation fails and it's a new user
      if (isNewUser) {
        await supabaseServiceRole.auth.admin.deleteUser(authUser.user.id);
      }
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

    // Send welcome email with improved handling
    let emailSent = false;
    let emailError = '';

    try {
      console.log("Attempting to send welcome email...");
      
      const loginUrl = `${req.headers.get('origin') || 'https://f7f3ec00-3a42-4b69-b48b-a0622a7f7b10.lovableproject.com'}/auth`;
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; font-size: 24px; margin: 0;">Welcome to ${requestData.name}</h1>
          </div>
          <div style="padding: 40px 30px; background: white;">
            <h2>Hi ${requestData.owner_name},</h2>
            <p>Your ${requestData.name} account has been set up successfully. Here are your login credentials:</p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Email:</strong> ${requestData.owner_email}</p>
              ${isNewUser ? `<p><strong>Temporary Password:</strong> <code style="background: #e9ecef; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code></p>` : '<p><strong>Login:</strong> Use your existing password</p>'}
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Login to Your Account</a>
            </div>
            ${isNewUser ? '<p><strong>Important:</strong> Please change your password after your first login for security reasons.</p>' : ''}
            <p>Best regards,<br>The KisanShaktiAI Team</p>
          </div>
          <div style="background: #f8f9fa; padding: 30px; text-align: center; color: #6b7280; font-size: 14px;">
            <p>This email contains sensitive login information. Please keep it secure.</p>
            <p>© 2025 KisanShaktiAI. All rights reserved.</p>
          </div>
        </div>
      `;

      const emailResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: requestData.owner_email,
          subject: `Welcome to ${requestData.name} - Your Account is Ready!`,
          html: emailHtml,
          metadata: {
            tenantId: tenant.id,
            userId: authUser.user.id,
            template_type: 'tenant_welcome_creation'
          }
        }),
      });

      if (emailResponse.ok) {
        const emailResult = await emailResponse.json();
        console.log('Email sent successfully:', emailResult);
        emailSent = true;
      } else {
        const emailErrorText = await emailResponse.text();
        console.error('Failed to send welcome email:', emailErrorText);
        emailError = emailErrorText;
      }
    } catch (error) {
      console.error('Error sending welcome email:', error);
      emailError = error.message;
    }

    // Return success with email status
    return new Response(JSON.stringify({ 
      success: true, 
      tenant: tenant,
      message: 'Tenant created successfully with admin user',
      adminEmail: requestData.owner_email,
      emailSent: emailSent,
      emailError: emailError || undefined,
      isNewUser: isNewUser,
      tempPassword: isNewUser ? tempPassword : undefined
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
