
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const action = url.searchParams.get('action'); // 'approve' or 'reject'
    const rejectionReason = url.searchParams.get('reason') || 'No reason provided';

    if (!token || !action) {
      return new Response('Invalid request parameters', { status: 400 });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find the pending request
    const { data: pendingRequest, error: fetchError } = await supabaseClient
      .from('pending_admin_requests')
      .select('*')
      .eq('request_token', token)
      .eq('status', 'pending')
      .single();

    if (fetchError || !pendingRequest) {
      return new Response('Request not found or already processed', { status: 404 });
    }

    // Check if request has expired
    if (new Date(pendingRequest.expires_at) < new Date()) {
      return new Response('Request has expired', { status: 400 });
    }

    if (action === 'approve') {
      // Decrypt the password
      let originalPassword: string;
      try {
        const encryptedPasswordData = JSON.parse(pendingRequest.password_hash);
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        
        const keyMaterial = await crypto.subtle.importKey(
          'raw',
          encoder.encode('kisanshakti-temp-key'), // Same key used for encryption
          { name: 'PBKDF2' },
          false,
          ['deriveBits', 'deriveKey']
        );
        
        const salt = new Uint8Array(encryptedPasswordData.salt);
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
          ['decrypt']
        );
        
        const iv = new Uint8Array(encryptedPasswordData.iv);
        const encryptedData = new Uint8Array(encryptedPasswordData.data);
        
        const decryptedData = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: iv },
          key,
          encryptedData
        );
        
        originalPassword = decoder.decode(decryptedData);
      } catch (decryptError) {
        console.error('Error decrypting password:', decryptError);
        return new Response('Failed to decrypt password', { status: 500 });
      }

      // Create the user account with OTP-based authentication
      const { data: authUser, error: signUpError } = await supabaseClient.auth.admin.createUser({
        email: pendingRequest.email,
        password: originalPassword,
        email_confirm: false, // We'll use OTP for email confirmation
        user_metadata: {
          full_name: pendingRequest.full_name,
          role: 'super_admin'
        }
      });

      if (signUpError) {
        console.error('Error creating user:', signUpError);
        return new Response(`Failed to create user account: ${signUpError.message}`, { status: 500 });
      }

      // Update the request status
      await supabaseClient
        .from('pending_admin_requests')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: 'admin@kisanshakti.in'
        })
        .eq('id', pendingRequest.id);

      // Send OTP to the approved user
      const { error: otpError } = await supabaseClient.auth.admin.generateLink({
        type: 'magiclink',
        email: pendingRequest.email,
        options: {
          redirectTo: `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'supabase.com')}/auth`
        }
      });

      if (otpError) {
        console.error('Error generating OTP:', otpError);
      }

      // Send approval email to the user
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        
        await resend.emails.send({
          from: "KisanShaktiAI <admin@kisanshakti.in>",
          to: [pendingRequest.email],
          subject: "Admin Access Approved - OTP Required",
          html: `
            <h2>Welcome to KisanShaktiAI!</h2>
            <p>Dear ${pendingRequest.full_name},</p>
            <p>Your admin access request has been approved. For security, we use OTP-based authentication.</p>
            <p><strong>Email:</strong> ${pendingRequest.email}</p>
            <p>You will receive an OTP code every time you log in. Check your email for the OTP when you attempt to sign in.</p>
            <p>Thank you for joining our team!</p>
          `,
        });
      }

      return new Response(`
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
            <h2 style="color: #10b981;">Request Approved Successfully!</h2>
            <p>The super admin access request for <strong>${pendingRequest.email}</strong> has been approved.</p>
            <p>The user has been notified via email and can now access the platform.</p>
          </body>
        </html>
      `, {
        headers: { "Content-Type": "text/html" },
      });

    } else if (action === 'reject') {
      // Update the request status
      await supabaseClient
        .from('pending_admin_requests')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          approved_by: 'admin@kisanshakti.in'
        })
        .eq('id', pendingRequest.id);

      // Send rejection email to the user
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        
        await resend.emails.send({
          from: "KisanShaktiAI <admin@kisanshakti.in>",
          to: [pendingRequest.email],
          subject: "Admin Access Request Update",
          html: `
            <h2>Access Request Update</h2>
            <p>Dear ${pendingRequest.full_name},</p>
            <p>We regret to inform you that your admin access request has been declined.</p>
            <p><strong>Reason:</strong> ${rejectionReason}</p>
            <p>If you have any questions, please contact our support team at admin@kisanshakti.in.</p>
          `,
        });
      }

      return new Response(`
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
            <h2 style="color: #ef4444;">Request Rejected</h2>
            <p>The super admin access request for <strong>${pendingRequest.email}</strong> has been rejected.</p>
            <p><strong>Reason:</strong> ${rejectionReason}</p>
            <p>The user has been notified via email.</p>
          </body>
        </html>
      `, {
        headers: { "Content-Type": "text/html" },
      });
    }

    return new Response('Invalid action', { status: 400 });

  } catch (error: any) {
    console.error("Error in approve-admin-request function:", error);
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
};

serve(handler);
