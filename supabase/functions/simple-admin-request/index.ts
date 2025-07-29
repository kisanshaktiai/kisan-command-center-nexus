
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { Resend } from "npm:resend@2.0.0";

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { fullName, email, password } = await req.json();

    console.log('Processing admin request for:', email);

    // Validate input
    if (!fullName || !email || !password) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if admin already exists
    const { data: existingAdmin } = await supabase
      .from('super_admin.admin_users')
      .select('email')
      .eq('email', email)
      .single();

    if (existingAdmin) {
      return new Response(JSON.stringify({ 
        error: "An admin with this email already exists" 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Store the pending request
    const { error: insertError } = await supabase
      .from('pending_admin_requests')
      .insert({
        full_name: fullName,
        email: email,
        password_hash: password, // Store temporarily for approval
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      });

    if (insertError) {
      console.error('Error storing request:', insertError);
      return new Response(JSON.stringify({ error: "Failed to store request" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Send notification email to existing admins
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        // Get admin emails from database instead of hardcoding
        const { data: adminUsers } = await supabaseClient
          .from('admin_users')
          .select('email')
          .eq('role', 'super_admin')
          .eq('is_active', true);
        
        const adminEmails = adminUsers?.map(user => user.email) || [];
        
        if (adminEmails.length > 0) {
          await resend.emails.send({
            from: "Platform Admin <noreply@platform.com>",
            to: adminEmails,
            subject: "New Admin Access Request",
          html: `
            <h2>New Admin Access Request</h2>
            <p><strong>Name:</strong> ${fullName}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Requested at:</strong> ${new Date().toLocaleString()}</p>
            <p>Please log in to the admin dashboard to approve or reject this request.</p>
          `,
        });
        console.log('Notification email sent successfully');
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Admin access request submitted successfully" 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in simple-admin-request:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
