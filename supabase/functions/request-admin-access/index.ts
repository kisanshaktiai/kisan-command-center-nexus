
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminRequestData {
  fullName: string;
  email: string;
  password: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { fullName, email, password }: AdminRequestData = await req.json();

    // Validate input
    if (!fullName || !email || !password) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: "Please provide a valid email address" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Store password encrypted for security (temporary storage for 24 hours)
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode('kisanshakti-temp-key'), // In production, use proper key management
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encoder.encode(password)
    );
    
    // Store encrypted password with salt and iv for decryption
    const encryptedPassword = {
      data: Array.from(new Uint8Array(encryptedData)),
      salt: Array.from(salt),
      iv: Array.from(iv)
    };

    // Check if email already exists in pending requests or auth.users
    const { data: existingRequest } = await supabaseClient
      .from('pending_admin_requests')
      .select('id')
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return new Response(JSON.stringify({ error: "A pending request already exists for this email" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Create pending request
    const { data: pendingRequest, error: insertError } = await supabaseClient
      .from('pending_admin_requests')
      .insert({
        full_name: fullName,
        email: email,
        password_hash: JSON.stringify(encryptedPassword), // Store encrypted password
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating pending request:', insertError);
      return new Response(JSON.stringify({ error: "Failed to create request" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Send notification email to admin@kisanshakti.in
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      
      const approvalUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/approve-admin-request?token=${pendingRequest.request_token}&action=approve`;
      const rejectUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/approve-admin-request?token=${pendingRequest.request_token}&action=reject`;

      await resend.emails.send({
        from: "KisanShaktiAI <admin@kisanshakti.in>",
        to: ["admin@kisanshakti.in"],
        subject: "New Admin Access Request",
        html: `
          <h2>New Admin Access Request</h2>
          <p><strong>Name:</strong> ${fullName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Requested at:</strong> ${new Date().toLocaleString()}</p>
          
          <div style="margin: 20px 0;">
            <a href="${approvalUrl}" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px;">Approve Request</a>
            <a href="${rejectUrl}" style="background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reject Request</a>
          </div>
          
          <p style="font-size: 12px; color: #666;">This request will expire in 24 hours.</p>
        `,
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Admin access request submitted successfully. Please wait for approval." 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in request-admin-access function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
