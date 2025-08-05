
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateTenantUserRequest {
  tenantId: string;
  email: string;
  fullName: string;
  leadId?: string;
  role?: string;
  sendActivationEmail?: boolean;
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
    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      tenantId,
      email,
      fullName,
      leadId,
      role = 'tenant_admin',
      sendActivationEmail = true
    }: CreateTenantUserRequest = await req.json();

    console.log(`Creating tenant user for ${email} in tenant ${tenantId}`);

    // Validate tenant exists
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      throw new Error('Invalid tenant ID');
    }

    // Check if user already exists
    const { data: existingUsers, error: userSearchError } = await supabase.auth.admin.listUsers();
    
    if (userSearchError) {
      console.warn('Could not search for existing users:', userSearchError);
    }

    const existingUser = existingUsers?.users?.find(u => u.email === email);
    let userId: string;

    if (existingUser) {
      console.log('User already exists, updating metadata');
      userId = existingUser.id;
      
      // Update existing user's metadata
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          full_name: fullName,
          tenant_id: tenantId,
          role: role,
          ...(leadId && { converted_from_lead: leadId })
        }
      });

      if (updateError) {
        console.error('Failed to update user metadata:', updateError);
        throw new Error('Failed to update user information');
      }
    } else {
      console.log('Creating new user');
      
      // Generate temporary password for new user
      const tempPassword = generateSecurePassword();
      
      // Create new user with email confirmation disabled initially
      const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: email,
        password: tempPassword,
        email_confirm: false, // We'll handle confirmation through our invitation flow
        user_metadata: {
          full_name: fullName,
          tenant_id: tenantId,
          role: role,
          ...(leadId && { converted_from_lead: leadId })
        }
      });

      if (createUserError || !newUser.user) {
        console.error('Failed to create user:', createUserError);
        throw new Error('Failed to create user account');
      }

      userId = newUser.user.id;
      console.log('User created successfully:', userId);
    }

    // Create user-tenant relationship
    const { error: tenantUserError } = await supabase
      .from('user_tenants')
      .upsert({
        user_id: userId,
        tenant_id: tenantId,
        role: role,
        is_active: true
      }, {
        onConflict: 'user_id,tenant_id'
      });

    if (tenantUserError) {
      console.error('Failed to create tenant user relationship:', tenantUserError);
      throw new Error('Failed to associate user with tenant');
    }

    // Generate invitation token for password reset/activation
    const invitationToken = crypto.randomUUID() + '-' + Date.now();
    
    // Create user invitation record
    const { data: invitation, error: invitationError } = await supabase
      .from('user_invitations')
      .insert({
        tenant_id: tenantId,
        lead_id: leadId,
        email: email,
        user_id: userId,
        invitation_token: invitationToken,
        invitation_type: 'tenant_activation',
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        created_by: null // System created
      })
      .select()
      .single();

    if (invitationError || !invitation) {
      console.error('Failed to create invitation:', invitationError);
      throw new Error('Failed to create activation invitation');
    }

    let emailResult = null;

    // Send activation email if requested
    if (sendActivationEmail) {
      const activationUrl = `${Deno.env.get('SITE_URL') || supabaseUrl.replace('//', '//app.')}/auth/activate?token=${invitationToken}`;
      
      try {
        const { data: emailResponse, error: emailError } = await supabase.functions.invoke('centralized-email-service', {
          body: {
            type: 'activation',
            tenantId: tenantId,
            recipientEmail: email,
            recipientName: fullName,
            templateData: {
              activation_url: activationUrl,
              tenant_name: tenant.name
            },
            invitationToken: invitationToken,
            leadId: leadId
          }
        });

        if (emailError) {
          console.error('Failed to send activation email:', emailError);
          // Don't fail the whole operation if email fails
        } else {
          emailResult = emailResponse;
          console.log('Activation email sent successfully');
        }
      } catch (error) {
        console.error('Error sending activation email:', error);
        // Continue without failing
      }
    }

    // Update lead status if this was a lead conversion
    if (leadId) {
      const { error: leadUpdateError } = await supabase
        .from('leads')
        .update({
          status: 'converted',
          converted_tenant_id: tenantId,
          converted_at: new Date().toISOString(),
          notes: `Converted to tenant user. Activation email sent to ${email}.`
        })
        .eq('id', leadId);

      if (leadUpdateError) {
        console.error('Failed to update lead status:', leadUpdateError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      user_id: userId,
      invitation_token: invitationToken,
      activation_url: sendActivationEmail ? `${Deno.env.get('SITE_URL') || supabaseUrl}/auth/activate?token=${invitationToken}` : null,
      email_sent: !!emailResult,
      message: 'Tenant user created successfully'
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error creating tenant user:", error);
    
    return new Response(JSON.stringify({
      error: error.message || "Failed to create tenant user"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

// Generate secure random password
function generateSecurePassword(): string {
  const length = 16;
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  let password = '';
  
  // Ensure at least one character from each category
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill remaining length with random characters from all categories
  const allChars = uppercase + lowercase + numbers + symbols;
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password to randomize character positions
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

serve(handler);
