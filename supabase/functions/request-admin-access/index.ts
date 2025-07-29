
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

interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  // Length checks
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }
  if (password.length > 64) {
    errors.push('Password must not exceed 64 characters');
  }

  // Character type checks
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[@#$%&*!?.,;:+=\-_~`^|<>()[\]{}\\/"']/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // No spaces allowed
  if (/\s/.test(password)) {
    errors.push('Password cannot contain spaces');
  }

  // Common password blacklist
  const commonPasswords = [
    'password123', 'admin123', 'administrator', 'password1234', 
    'admin1234', 'welcome123', 'qwerty123', 'abc123456', 
    'password@123', 'admin@123', 'kisanshakti123', 'superadmin123',
    'adminpassword', 'passwordadmin', 'kisanshakti@123'
  ];

  const lowercasePassword = password.toLowerCase();
  if (commonPasswords.some(common => lowercasePassword.includes(common))) {
    errors.push('Password contains common patterns that are not allowed');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
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

    console.log('Processing admin request for email:', email);

    // Validate input
    if (!fullName || !email || !password) {
      console.error('Missing required fields:', { fullName: !!fullName, email: !!email, password: !!password });
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('Invalid email format:', email);
      return new Response(JSON.stringify({ error: "Please provide a valid email address" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      console.error('Password validation failed:', passwordValidation.errors);
      return new Response(JSON.stringify({ 
        error: `Password requirements not met: ${passwordValidation.errors.join(', ')}` 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // First, delete any existing expired or rejected requests for this email
    const { error: deleteError } = await supabaseClient
      .from('pending_admin_requests')
      .delete()
      .eq('email', email)
      .or('status.eq.rejected,expires_at.lt.now()');

    if (deleteError) {
      console.error('Error cleaning up old requests:', deleteError);
    } else {
      console.log('Cleaned up old requests for email:', email);
    }

    // Check for existing pending requests after cleanup
    const { data: existingRequest, error: fetchError } = await supabaseClient
      .from('pending_admin_requests')
      .select('id, status, created_at, expires_at')
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error checking existing requests:', fetchError);
      return new Response(JSON.stringify({ error: "Database error occurred" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (existingRequest) {
      const now = new Date();
      const expiresAt = new Date(existingRequest.expires_at);
      
      if (now <= expiresAt) {
        console.log('Found active pending request for email:', email);
        return new Response(JSON.stringify({ 
          error: "A pending admin request already exists for this email. Please wait for approval or contact the administrator." 
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    // Encrypt password temporarily for storage
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode('kisanshakti-temp-key-v2'), // Changed key for security
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
    
    const encryptedPassword = {
      data: Array.from(new Uint8Array(encryptedData)),
      salt: Array.from(salt),
      iv: Array.from(iv)
    };

    console.log('Creating new admin request for email:', email);

    // Create pending request with better error handling
    const { data: pendingRequest, error: insertError } = await supabaseClient
      .from('pending_admin_requests')
      .insert({
        full_name: fullName,
        email: email,
        password_hash: JSON.stringify(encryptedPassword),
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating pending request:', insertError);
      
      // Handle specific database errors
      if (insertError.code === '23505') { // Unique constraint violation
        return new Response(JSON.stringify({ 
          error: "A request for this email already exists. Please wait for processing or contact support." 
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      
      return new Response(JSON.stringify({ 
        error: "Failed to create request. Please try again later." 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log('Successfully created admin request:', pendingRequest.id);

    // Send notification email to admin
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        
        const approvalUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/approve-admin-request?token=${pendingRequest.request_token}&action=approve`;
        const rejectUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/approve-admin-request?token=${pendingRequest.request_token}&action=reject`;

        // Get admin emails from database
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
            
            <div style="margin: 20px 0;">
              <a href="${approvalUrl}" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px;">Approve Request</a>
              <a href="${rejectUrl}" style="background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reject Request</a>
            </div>
            
            <p style="font-size: 12px; color: #666;">This request will expire in 24 hours.</p>
          `,
        });

        console.log('Notification email sent successfully');
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
        // Don't fail the request if email fails
      }
    } else {
      console.warn('RESEND_API_KEY not configured, skipping email notification');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Admin access request submitted successfully. Please wait for approval." 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Unexpected error in request-admin-access function:", error);
    return new Response(JSON.stringify({ 
      error: "An unexpected error occurred. Please try again later." 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
