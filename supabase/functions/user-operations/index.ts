import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateSecurePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[user-operations] ${req.method} ${req.url}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const url = new URL(req.url);
    let operation = url.searchParams.get('operation');

    let body: any = {};
    if (req.method === 'POST') {
      body = await req.json();
      operation = body.operation || operation;
    }

    console.log(`[user-operations] operation: ${operation}`);

    switch (operation) {
      case 'check-exists':
        return await checkUserExists(supabase, body);
      
      case 'get':
        return await getUserByEmail(supabase, body);
      
      case 'register':
        return await registerUserWithWelcome(supabase, body);
      
      default:
        return new Response(JSON.stringify({ 
          error: 'Invalid operation. Use: check-exists, get, or register' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    }

  } catch (error: any) {
    console.error('[user-operations] Error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

// Check if user exists
async function checkUserExists(supabase: any, body: any): Promise<Response> {
  const { email, user_email } = body;
  const checkEmail = email || user_email;

  if (!checkEmail) {
    return new Response(JSON.stringify({ error: 'Email is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('Error fetching auth users:', authError);
    return new Response(JSON.stringify({ error: 'Failed to check user existence' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const existingUser = authUsers.users.find((user: any) => user.email === checkEmail);

  if (!existingUser) {
    return new Response(JSON.stringify({ exists: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const { data: adminData, error: adminError } = await supabase
    .from('admin_users')
    .select('*')
    .eq('id', existingUser.id)
    .single();

  const isAdmin = !adminError && adminData;

  return new Response(JSON.stringify({ 
    exists: true, 
    isAdmin,
    userId: existingUser.id,
    userStatus: existingUser.email_confirmed_at ? 'confirmed' : 'pending'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

// Get user by email
async function getUserByEmail(supabase: any, body: any): Promise<Response> {
  const { user_email, email } = body;
  const searchEmail = user_email || email;

  if (!searchEmail) {
    return new Response(JSON.stringify({ error: 'Email is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const { data: users, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error('Error fetching users:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch user' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const user = users.users.find((u: any) => u.email === searchEmail);

  if (!user) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  return new Response(JSON.stringify([{
    id: user.id,
    email: user.email,
    created_at: user.created_at,
    email_confirmed_at: user.email_confirmed_at
  }]), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

// Register user with welcome email
async function registerUserWithWelcome(supabase: any, body: any): Promise<Response> {
  const { 
    email, 
    fullName, 
    password, 
    tenantId, 
    role = 'user',
    metadata = {},
    sendWelcomeEmail = true,
    welcomeEmailData = {}
  } = body;

  console.log('User registration request:', { email, fullName, tenantId, role, sendWelcomeEmail });

  if (!email || !fullName) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Email and full name are required" 
    }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }

  const userPassword = password || generateSecurePassword();
  let userId: string;
  let isNewUser = false;

  try {
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      throw new Error(`Failed to check existing users: ${listError.message}`);
    }

    const existingUser = existingUsers.users?.find((user: any) => user.email === email);

    if (existingUser) {
      console.log('User already exists:', existingUser.id);
      userId = existingUser.id;
      
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
                
                <p>Best regards,<br>The ${tenantName} Team</p>
              </div>
            `,
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
      }
    }

    return new Response(JSON.stringify({
      success: true,
      userId,
      email,
      isNewUser,
      emailSent,
      ...(isNewUser && { tempPassword: userPassword })
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (authError) {
    console.error('Authentication error:', authError);
    
    return new Response(JSON.stringify({
      success: false,
      error: authError instanceof Error ? authError.message : 'Authentication service error'
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}

serve(handler);
