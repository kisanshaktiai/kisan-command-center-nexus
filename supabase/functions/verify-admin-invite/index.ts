import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyInviteRequest {
  token: string;
}

interface AcceptInviteRequest {
  token: string;
  fullName: string;
  password: string;
  phone?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const isAcceptRequest = url.pathname.includes('/accept');

    if (req.method === 'GET' && !isAcceptRequest) {
      // Verify invite token
      const token = url.searchParams.get('token');
      if (!token) {
        return new Response(JSON.stringify({ 
          error: 'Missing invite token' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const { data: invite, error } = await supabase
        .from('invites')
        .select('*')
        .eq('token', token)
        .single();

      if (error || !invite) {
        return new Response(JSON.stringify({
          valid: false,
          error: 'Invalid invite token'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const isValid = invite.used_at === null && new Date(invite.expires_at) > new Date();
      
      if (!isValid) {
        return new Response(JSON.stringify({
          valid: false,
          error: invite.used_at ? 'Invite has already been used' : 'Invite has expired'
        }), {
          status: 410,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      return new Response(JSON.stringify({
        valid: isValid,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expires_at
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (req.method === 'POST' && isAcceptRequest) {
      // Accept invite and create user
      const { token, fullName, password, phone }: AcceptInviteRequest = await req.json();

      if (!token || !fullName || !password) {
        return new Response(JSON.stringify({ 
          error: 'Missing required fields: token, fullName, password' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // Validate invite token first
      const { data: invite, error: validateError } = await supabase
        .from('invites')
        .select('*')
        .eq('token', token)
        .single();

      if (validateError || !invite) {
        return new Response(JSON.stringify({
          error: 'Invalid invite token'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const isValid = invite.used_at === null && new Date(invite.expires_at) > new Date();
      
      if (!isValid) {
        return new Response(JSON.stringify({
          error: invite.used_at ? 'Invite has already been used' : 'Invite has expired'
        }), {
          status: 410,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // Create user account
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: invite.email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          phone: phone || '',
          invite_role: invite.role
        }
      });

      if (userError) {
        throw new Error(`Failed to create user: ${userError.message}`);
      }

      // Add user to admin_users table
      const { error: adminError } = await supabase
        .from('admin_users')
        .insert({
          id: userData.user.id,
          email: invite.email,
          full_name: fullName,
          role: invite.role,
          is_active: true
        });

      if (adminError) {
        // If admin user creation fails, delete the auth user
        await supabase.auth.admin.deleteUser(userData.user.id);
        throw new Error(`Failed to create admin user: ${adminError.message}`);
      }

      // Mark invite as used
      const { error: updateError } = await supabase
        .from('invites')
        .update({
          used_at: new Date().toISOString()
        })
        .eq('token', token);

      if (updateError) {
        console.error('Failed to update invite status:', updateError);
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Admin account created successfully',
        user: {
          id: userData.user.id,
          email: userData.user.email,
          role: invite.role
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in verify-admin-invite:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);