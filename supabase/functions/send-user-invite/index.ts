
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, user-id',
};

// Use Service Role Key - bypasses RLS
const SUPABASE_URL = "https://qfklkkzxemsbeniyugiz.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface InviteRequest {
  tenantId: string;
  email: string;
  firstName: string;
  lastName?: string;
  role: string;
  tenantName?: string;
  inviterName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== send-user-invite function started ===');
    
    // Validate Service Role Key is available
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Service configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Create Supabase client with Service Role Key (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get inviter user ID from header
    const inviterUserId = req.headers.get('user-id');
    if (!inviterUserId) {
      console.error('No user-id header provided');
      return new Response(
        JSON.stringify({ success: false, error: 'User ID required in header' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Inviter user ID from header:', inviterUserId);
    
    // Parse request body
    let requestBody: InviteRequest;
    try {
      requestBody = await req.json() as InviteRequest;
      console.log('Parsed request body:', {
        tenantId: requestBody.tenantId,
        email: requestBody.email,
        firstName: requestBody.firstName,
        lastName: requestBody.lastName,
        role: requestBody.role
      });
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const {
      tenantId,
      email,
      firstName,
      lastName,
      role,
      tenantName = 'Your Organization',
      inviterName = 'Admin'
    } = requestBody;

    // Validate required fields
    if (!tenantId || !email || !firstName || !role) {
      const missingFields = [];
      if (!tenantId) missingFields.push('tenantId');
      if (!email) missingFields.push('email');
      if (!firstName) missingFields.push('firstName');
      if (!role) missingFields.push('role');
      
      console.error('Missing required fields:', missingFields);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Missing required fields: ${missingFields.join(', ')}` 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('Invalid email format:', email);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email format' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Verify tenant exists
    console.log('Verifying tenant existence...');
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenantData) {
      console.error('Tenant verification failed:', tenantError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Tenant does not exist or access denied' 
        }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Tenant verified:', tenantData);

    // Get admin user record for the inviter
    console.log('Getting admin user record...');
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email, full_name')
      .eq('id', inviterUserId)
      .single();

    if (adminError || !adminUser) {
      console.error('Admin user not found:', adminError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Inviter is not authorized as admin' 
        }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Admin user verified:', adminUser);

    // Generate unique invitation token
    let invitationToken: string = crypto.randomUUID();
    let tokenIsUnique = false;
    let attempts = 0;
    const maxAttempts = 5;

    console.log('=== TOKEN GENERATION START ===');
    
    while (!tokenIsUnique && attempts < maxAttempts) {
      console.log(`Checking token uniqueness, attempt ${attempts + 1}:`, invitationToken);
      
      const { data: existingToken, error: tokenCheckError } = await supabase
        .from('user_invitations')
        .select('id')
        .eq('invitation_token', invitationToken)
        .maybeSingle();
      
      if (tokenCheckError) {
        console.log('Token check error:', tokenCheckError.message);
      }
      
      tokenIsUnique = !existingToken;
      if (!tokenIsUnique) {
        console.log('❌ Token exists, generating new one');
        invitationToken = crypto.randomUUID();
      } else {
        console.log('✅ Token is unique:', invitationToken);
      }
      attempts++;
    }

    // Strict guard after the loop
    if (!invitationToken || !tokenIsUnique) {
      console.error('Failed to generate a unique invitation token');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to generate a unique invitation token',
          code: 'TOKEN_GENERATION_ERROR'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Check for existing active invitations
    console.log('Checking for existing invitations...');
    const { data: existingInvites, error: checkError } = await supabase
      .from('user_invitations')
      .select('id, email, status')
      .eq('tenant_id', tenantId)
      .eq('email', email.toLowerCase().trim())
      .in('status', ['pending', 'sent']);

    if (checkError) {
      console.error('Error checking existing invitations:', checkError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to check existing invitations' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (existingInvites && existingInvites.length > 0) {
      console.log('Found existing invitation:', existingInvites[0]);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'An active invitation for this email already exists' 
        }),
        { status: 409, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Prepare invitation data
    const invitationData = {
      tenant_id: tenantId,
      email: email.toLowerCase().trim(),
      first_name: firstName,
      last_name: lastName || '',
      role: role,
      invitation_token: invitationToken,
      invitation_type: 'tenant_activation', // Using valid enum value
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_by: adminUser.id,
      invited_by: adminUser.id,
      inviter_name: inviterName || adminUser.full_name,
      tenant_name: tenantName || tenantData.name,
      metadata: {
        invitation_source: 'admin_panel',
        tenant_name: tenantName || tenantData.name,
        inviter_name: inviterName || adminUser.full_name
      }
    };

    console.log('=== ATTEMPTING DATABASE INSERT ===');
    console.log('Insert data:', JSON.stringify(invitationData, null, 2));

    // Insert invitation record
    const { data: invitation, error: insertError } = await supabase
      .from('user_invitations')
      .insert(invitationData)
      .select('id')
      .single();

    if (insertError) {
      console.error('❌ DATABASE INSERTION ERROR:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to create invitation: ${insertError.message}`,
          debug: {
            errorCode: insertError.code,
            errorDetails: insertError.details,
            errorHint: insertError.hint,
            sentData: invitationData
          }
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('✅ Invitation created successfully with ID:', invitation.id);

    // Try to send email if Resend API key is configured
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const siteUrl = Deno.env.get('SITE_URL') || 'https://your-app.com';
    let emailSent = false;
    let emailError = null;

    if (resendApiKey) {
      try {
        console.log('Attempting to send invitation email...');
        
        const inviteUrl = `${siteUrl}/accept-invitation?token=${invitationToken}`;
        
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'noreply@yourdomain.com',
            to: [email],
            subject: `You're invited to join ${tenantName || tenantData.name}`,
            html: `
              <h1>You're invited to join ${tenantName || tenantData.name}</h1>
              <p>Hi ${firstName},</p>
              <p>${inviterName || adminUser.full_name} has invited you to join ${tenantName || tenantData.name} as a ${role}.</p>
              <p><a href="${inviteUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accept Invitation</a></p>
              <p>Or copy and paste this link in your browser: ${inviteUrl}</p>
              <p>This invitation expires in 7 days.</p>
              <p>Best regards,<br>The ${tenantName || tenantData.name} Team</p>
            `,
          }),
        });

        if (emailResponse.ok) {
          console.log('Email sent successfully');
          emailSent = true;
          
          // Update invitation status to 'sent'
          await supabase
            .from('user_invitations')
            .update({ 
              status: 'sent',
              sent_at: new Date().toISOString()
            })
            .eq('id', invitation.id);
        } else {
          const errorText = await emailResponse.text();
          console.error('Failed to send email:', errorText);
          emailError = errorText;
        }
      } catch (error) {
        console.error('Error sending email:', error);
        emailError = error.message;
      }
    } else {
      console.log('Email not sent - RESEND_API_KEY not configured');
    }

    // Return success response
    const response = {
      success: true,
      invitationId: invitation.id,
      message: 'Invitation created successfully',
      emailSent: emailSent,
      inviteUrl: `${siteUrl}/accept-invitation?token=${invitationToken}`,
      ...(emailError && { emailError: emailError })
    };

    console.log('✅ Returning success response:', response);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('❌ Unexpected error in send-user-invite function:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Unexpected error: ${error.message}`,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);
