
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { requestId, action } = await req.json(); // action: 'approve' or 'reject'

    console.log('Processing admin request action:', action, 'for request:', requestId);

    // Get the pending request
    const { data: request, error: fetchError } = await supabaseAdmin
      .from('pending_admin_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (action === 'approve') {
      // Create the user in Supabase Auth
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: request.email,
        password: request.password_hash,
        email_confirm: true,
        user_metadata: {
          full_name: request.full_name,
          role: 'support_admin'
        }
      });

      if (authError) {
        console.error('Failed to create auth user:', authError);
        return new Response(JSON.stringify({ error: authError.message }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Add to super_admin.admin_users
      const { error: adminError } = await supabaseAdmin
        .from('super_admin.admin_users')
        .insert({
          id: authUser.user.id,
          email: request.email,
          full_name: request.full_name,
          role: 'support_admin',
          is_active: true
        });

      if (adminError) {
        console.error('Failed to create admin record:', adminError);
      }

      // Update request status
      await supabaseAdmin
        .from('pending_admin_requests')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: 'super_admin'
        })
        .eq('id', requestId);

      console.log('Admin user approved and created:', authUser.user.id);

    } else if (action === 'reject') {
      // Update request status
      await supabaseAdmin
        .from('pending_admin_requests')
        .update({ 
          status: 'rejected',
          approved_at: new Date().toISOString(),
          approved_by: 'super_admin'
        })
        .eq('id', requestId);

      console.log('Admin request rejected:', requestId);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Request ${action}d successfully` 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in approve-admin:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
