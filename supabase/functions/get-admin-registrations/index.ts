
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Verify user token and get user info
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Check if user is super admin
    const { data: adminUser, error: adminError } = await supabaseClient
      .from('admin_users')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (adminError || !adminUser || adminUser.role !== 'super_admin' || !adminUser.is_active) {
      return new Response(JSON.stringify({ 
        error: 'You don\'t have permission to view admin registrations.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Fetch admin registrations with service role
    const { data: registrations, error: regError } = await supabaseClient
      .from('admin_registrations')
      .select('id, email, status, created_at')
      .order('created_at', { ascending: false });

    if (regError) {
      console.error('Error fetching admin registrations:', regError);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch admin registrations' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Return only safe fields
    const safeRegistrations = (registrations || []).map(reg => ({
      id: reg.id,
      email: reg.email,
      status: reg.status,
      created_at: reg.created_at
    }));

    return new Response(JSON.stringify({ 
      registrations: safeRegistrations 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in get-admin-registrations:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
