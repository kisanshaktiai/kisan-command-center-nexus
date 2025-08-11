
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserRegistrationRequest {
  email: string;
  fullName: string;
  password?: string;
  tenantId?: string;
  role?: string;
  metadata?: Record<string, any>;
  sendWelcomeEmail?: boolean;
  welcomeEmailData?: {
    tenantName?: string;
    loginUrl?: string;
    customMessage?: string;
  };
}

interface UserRegistrationResponse {
  success: boolean;
  userId?: string;
  email?: string;
  isNewUser?: boolean;
  emailSent?: boolean;
  error?: string;
  tempPassword?: string;
}

function generateSecurePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const requestBody: UserRegistrationRequest = await req.json();
    const { 
      email, 
      fullName, 
      password, 
      tenantId, 
      role = 'user',
      metadata = {},
      sendWelcomeEmail = true,
      welcomeEmailData = {}
    } = requestBody;

    console.log('User registration request:', { email, fullName, tenantId, role, sendWelcomeEmail });

    // Validate required fields
    if (!email || !fullName) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Email and full name are required" 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate password if not provided
    const userPassword = password || generateSecurePassword();
    let userId: string;
    let isNewUser = false;

    try {
      // Check if user already exists in auth.users
      const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        console.error('Error listing users:', listError);
        throw new Error(`Failed to check existing users: ${listError.message}`);
      }

      const existingUser = existingUsers.users?.find(user => user.email === email);

      if (existingUser) {
        console.log('User already exists:', existingUser.id);
        userId = existingUser.id;
        
        // Update existing user metadata if needed
        if (tenantId || Object.keys(metadata).length > 0) {
          const updateMetadata = {
            ...existingUser.user_metadata,
            full_name: fullName,
            ...(tenantId && { tenant_id: tenantId }),
            ...metadata
          };

          const { error: updateError } = await supabase.auth.admin.updateUserById(
            userId,
            { user_metadata: updateMetadata }
          );

          if (updateError) {
            console.error('Failed to update user metadata:', updateError);
          } else {
            console.log('Updated existing user metadata');
          }
        }
      } else {
        console.log('Creating new user...');
        
        // Create new user
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email,
          password: userPassword,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            ...(tenantId && { tenant_id: tenantId }),
            role,
            ...metadata
          }
        });

        if (createError) {
          console.error('Failed to create user:', createError);
          throw new Error(`Failed to create user: ${createError.message}`);
        }

        if (!newUser.user) {
          throw new Error('User creation returned no user data');
        }

        userId = newUser.user.id;
        isNewUser = true;
        console.log('Created new user:', userId);
      }

      // Send welcome email if requested
      let emailSent = false;
      if (sendWelcomeEmail && isNewUser) {
        try {
          const loginUrl = welcomeEmailData.loginUrl || `${Deno.env.get('SITE_URL') || 'https://yourapp.com'}/auth`;
          const tenantName = welcomeEmailData.tenantName || 'Our Platform';
          
          console.log('Sending welcome email...');
          
          const emailResponse = await supabase.functions.invoke('send-email', {
            body: {
              to: email,
              subject: `Welcome to ${tenantName}!`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h1>Welcome to ${tenantName}!</h1>
                  <p>Dear ${fullName},</p>
                  <p>Welcome to our platform! Your account has been successfully created.</p>
                  
                  <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <h3>Login Credentials:</h3>
                    <p><strong>Email:</strong> ${email}</p>
                    ${isNewUser ? `<p><strong>Password:</strong> ${userPassword}</p>` : ''}
                    ${tenantName !== 'Our Platform' ? `<p><strong>Organization:</strong> ${tenantName}</p>` : ''}
                  </div>
                  
                  ${isNewUser ? '<p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>' : ''}
                  ${welcomeEmailData.customMessage ? `<p>${welcomeEmailData.customMessage}</p>` : ''}
                  
                  <div style="margin: 30px 0;">
                    <a href="${loginUrl}" 
                       style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                      Login to Your Account
                    </a>
                  </div>
                  
                  <p>If you have any questions, please don't hesitate to contact our support team.</p>
                  
                  <p>Best regards,<br>The ${tenantName} Team</p>
                </div>
              `,
              text: `Welcome to ${tenantName}! Dear ${fullName}, your account has been created. Login details: Email: ${email}${isNewUser ? `, Password: ${userPassword}` : ''}. Login at: ${loginUrl}`,
              metadata: {
                type: 'user_welcome',
                tenant_id: tenantId,
                user_id: userId,
                template_type: 'welcome'
              }
            }
          });

          if (emailResponse.error) {
            console.error('Failed to send welcome email:', emailResponse.error);
          } else {
            emailSent = true;
            console.log('Welcome email sent successfully');
          }
        } catch (emailError) {
          console.error('Email sending error:', emailError);
          // Don't fail the registration for email errors
        }
      }

      // Return success response
      const response: UserRegistrationResponse = {
        success: true,
        userId,
        email,
        isNewUser,
        emailSent,
        ...(isNewUser && { tempPassword: userPassword })
      };

      console.log('User registration completed:', { userId, email, isNewUser, emailSent });

      return new Response(
        JSON.stringify(response),
        { 
          status: 200, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );

    } catch (authError) {
      console.error('Authentication error:', authError);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: authError instanceof Error ? authError.message : 'Authentication service error'
        }),
        { 
          status: 500, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

  } catch (error: any) {
    console.error("User registration service error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'User registration service error'
      }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  }
};

serve(handler);
