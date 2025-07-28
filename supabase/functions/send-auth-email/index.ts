
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuthEmailData {
  user: {
    email: string;
    id: string;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
}

const generateAuthEmail = (emailType: string, token: string, email: string) => {
  const baseStyles = `
    font-family: Arial, sans-serif; 
    line-height: 1.6; 
    color: #333; 
    max-width: 600px; 
    margin: 0 auto; 
    padding: 20px;
  `;

  const headerStyles = `
    background: linear-gradient(135deg, #2d7d32, #4caf50); 
    padding: 30px; 
    text-align: center; 
    border-radius: 10px 10px 0 0;
  `;

  const contentStyles = `
    background: white; 
    padding: 30px; 
    border-radius: 0 0 10px 10px; 
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  `;

  const codeStyles = `
    background: #f5f5f5; 
    padding: 20px; 
    text-align: center; 
    border-radius: 5px; 
    margin: 20px 0;
  `;

  let title = "KisanShakti AI";
  let heading = "Your Authentication Code";
  let message = "Here's your authentication code:";
  let note = "This code will expire in 60 seconds for security reasons.";

  switch (emailType) {
    case 'signup':
      title = "Welcome to KisanShakti AI!";
      heading = "Confirm Your Email Address";
      message = "Thanks for signing up! Please confirm your email address by using the code below:";
      break;
    case 'magiclink':
      title = "Sign In to KisanShakti AI";
      heading = "Your Sign-In Code";
      message = "Use this code to sign in to your KisanShakti AI account:";
      break;
    case 'recovery':
      title = "Password Reset";
      heading = "Reset Your Password";
      message = "You requested a password reset. Use this code to reset your password:";
      break;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>${title}</title>
    </head>
    <body style="${baseStyles}">
        <div style="${headerStyles}">
            <h1 style="color: white; margin: 0;">${title}</h1>
        </div>
        <div style="${contentStyles}">
            <h2 style="color: #2d7d32;">${heading}</h2>
            <p>${message}</p>
            
            <div style="${codeStyles}">
                <h2 style="color: #2d7d32; font-family: monospace; letter-spacing: 2px; margin: 0;">${token}</h2>
            </div>
            
            <p>${note}</p>
            <p>If you didn't request this, please ignore this email.</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">This email was sent to ${email}</p>
        </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting auth email processing...');
    
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);
    
    console.log('Headers received:', Object.keys(headers));
    
    if (!hookSecret) {
      console.error('SEND_EMAIL_HOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Hook secret not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!Deno.env.get('RESEND_API_KEY')) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Resend API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const wh = new Webhook(hookSecret);
    let emailData: AuthEmailData;

    try {
      emailData = wh.verify(payload, headers) as AuthEmailData;
    } catch (verifyError) {
      console.error('Webhook verification failed:', verifyError);
      return new Response(
        JSON.stringify({ error: 'Webhook verification failed' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { user, email_data } = emailData;
    const { token, email_action_type } = email_data;

    console.log('Processing email for:', user.email, 'Action:', email_action_type);

    const subject = `KisanShakti AI - ${email_action_type === 'signup' ? 'Email Verification' : 
                     email_action_type === 'magiclink' ? 'Sign In Code' : 
                     email_action_type === 'recovery' ? 'Password Reset' : 'Authentication Code'}`;

    const htmlContent = generateAuthEmail(email_action_type, token, user.email);

    const { data: emailResponse, error: emailError } = await resend.emails.send({
      from: 'KisanShakti AI <noreply@kisanshaktiai.in>',
      to: [user.email],
      subject,
      html: htmlContent,
    });

    if (emailError) {
      console.error('Resend error:', emailError);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: emailError }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Email sent successfully:', emailResponse?.id);

    return new Response(
      JSON.stringify({ success: true, email_id: emailResponse?.id }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    console.error('Error in send-auth-email function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);
