import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Hardcoded values to avoid environment variable issues
const SUPABASE_URL = "https://qfklkkzxemsbeniyugiz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFma2xra3p4ZW1zYmVuaXl1Z2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MjcxNjUsImV4cCI6MjA2ODAwMzE2NX0.dUnGp7wbwYom1FPbn_4EGf3PWjgmr8mXwL2w2SdYOh4";

interface InviteRequest {
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
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
    
    // Create Supabase client with hardcoded values
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Get the authorization header to validate JWT and get user info
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Validate JWT and get user info
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      console.error('Invalid JWT token:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication token' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Authenticated user:', { id: user.id, email: user.email });
    
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

    // Verify tenant exists and user has access
    console.log('Checking tenant existence and user access...');
    const { data: tenantData, error: tenantError } = await supabase
      .from('user_tenants')
      .select('tenant_id, role, is_active')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (tenantError || !tenantData) {
      console.error('Tenant access check failed:', tenantError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'You do not have access to this tenant or tenant does not exist' 
        }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('User has access to tenant:', tenantData);

    // Generate unique invitation token with fallback
    let invitationToken: string = crypto.randomUUID(); // Initialize with fallback
    let tokenIsUnique = false;
    let attempts = 0;
    const maxAttempts = 5;

    console.log('=== TOKEN GENERATION START ===');
    console.log('Initial invitationToken value:', invitationToken);
    console.log('Initial invitationToken type:', typeof invitationToken);
    console.log('Initial invitationToken length:', invitationToken ? invitationToken.length : 'NULL/UNDEFINED');

    while (!tokenIsUnique && attempts < maxAttempts) {
      console.log(`=== TOKEN ATTEMPT ${attempts + 1} ===`);
      console.log('Current invitationToken before check:', invitationToken);
      console.log('Current invitationToken type:', typeof invitationToken);
      
      // Check if token already exists
      const { data: existingToken, error: tokenCheckError } = await supabase
        .from('user_invitations')
        .select('id')
        .eq('invitation_token', invitationToken)
        .single();
      
      if (tokenCheckError) {
        console.log('Token check error (this is expected for unique tokens):', tokenCheckError.message);
      }
      
      if (!existingToken) {
        tokenIsUnique = true;
        console.log('✅ Token is unique:', invitationToken);
      } else {
        console.log('❌ Token already exists, generating new one. Existing token ID:', existingToken.id);
        invitationToken = crypto.randomUUID();
        console.log('New generated token:', invitationToken);
      }
      attempts++;
    }

    console.log('=== TOKEN GENERATION END ===');
    console.log('Final invitationToken value:', invitationToken);
    console.log('Final invitationToken type:', typeof invitationToken);
    console.log('Final tokenIsUnique:', tokenIsUnique);
    console.log('Final attempts made:', attempts);

    // Final validation before insert
    if (!invitationToken) {
      console.error('❌ CRITICAL: invitationToken is falsy after generation!');
      console.error('invitationToken value:', invitationToken);
      console.error('invitationToken type:', typeof invitationToken);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to generate invitation token',
          code: 'TOKEN_GENERATION_ERROR',
          debug: {
            tokenValue: invitationToken,
            tokenType: typeof invitationToken,
            attempts: attempts
          }
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!tokenIsUnique) {
      console.error('❌ Failed to generate unique invitation token after', maxAttempts, 'attempts');
      console.error('Final token value:', invitationToken);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to generate unique invitation token',
          code: 'TOKEN_GENERATION_ERROR',
          debug: {
            tokenValue: invitationToken,
            maxAttempts: maxAttempts,
            actualAttempts: attempts
          }
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('✅ Successfully generated unique invitation token:', invitationToken);

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

    // Create security context for metadata
    const requestId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const securityContext = {
      userId: user.id,
      userEmail: user.email,
      requestId: requestId,
      timestamp: timestamp,
      action: 'create_invitation',
      tenantId: tenantId
    };

    // Validate all required fields before database operation
    const requiredFields = { 
      tenantId, 
      email: email.toLowerCase().trim(), 
      firstName, 
      role, 
      invitationToken 
    };
    
    console.log('=== PRE-INSERT VALIDATION ===');
    console.log('All required fields before validation:', requiredFields);
    
    for (const [key, value] of Object.entries(requiredFields)) {
      console.log(`Validating field "${key}":`, {
        value: value,
        type: typeof value,
        length: typeof value === 'string' ? value.length : 'N/A',
        isEmpty: !value || (typeof value === 'string' && value.trim() === '')
      });
      
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        console.error(`❌ Missing or empty required field: ${key}`, value);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Missing required field: ${key}`,
            code: 'VALIDATION_ERROR',
            debug: {
              fieldName: key,
              fieldValue: value,
              fieldType: typeof value
            }
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    }

    console.log('✅ All required fields validated successfully');

    // Prepare invitation data for insertion
    const invitationData = {
      tenant_id: tenantId,
      email: email.toLowerCase().trim(),
      first_name: firstName,
      last_name: lastName || '',
      role: role,
      inviter_name: inviterName,
      tenant_name: tenantName,
      invitation_token: invitationToken,
      status: 'pending',
      invited_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      created_by: user.id,
      metadata: {
        security_context: securityContext,
        invitation_source: 'admin_panel',
        tenant_name: tenantName,
        inviter_name: inviterName
      }
    };

    console.log('=== CRITICAL: PRE-INSERT DATA LOGGING ===');
    console.log('Complete invitationData object:', JSON.stringify(invitationData, null, 2));
    console.log('Specific invitation_token field:', {
      value: invitationData.invitation_token,
      type: typeof invitationData.invitation_token,
      length: invitationData.invitation_token ? invitationData.invitation_token.length : 'NULL/UNDEFINED',
      isNull: invitationData.invitation_token === null,
      isUndefined: invitationData.invitation_token === undefined,
      isFalsy: !invitationData.invitation_token
    });

    // Additional safety check right before insert
    if (!invitationData.invitation_token) {
      console.error('❌ CRITICAL ERROR: invitation_token is null/undefined in invitationData!');
      console.error('This should never happen after our validations');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Critical error: invitation_token became null before insert',
          code: 'CRITICAL_TOKEN_ERROR',
          debug: {
            invitationDataKeys: Object.keys(invitationData),
            tokenField: invitationData.invitation_token
          }
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('=== ATTEMPTING DATABASE INSERT ===');
    console.log('About to insert with invitation_token:', invitationData.invitation_token);

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
      
      // Log the data that failed to insert
      console.error('Failed insertion data:', JSON.stringify(invitationData, null, 2));
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to create invitation: ${insertError.message}`,
          debug: {
            errorCode: insertError.code,
            errorDetails: insertError.details,
            sentData: invitationData
          }
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('✅ Invitation created successfully with ID:', invitation.id);

    // Try to send email if Resend API key and SITE_URL are configured
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const siteUrl = Deno.env.get('SITE_URL');
    let emailSent = false;
    let emailError = null;

    if (resendApiKey && siteUrl) {
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
            subject: `You're invited to join ${tenantName}`,
            html: `
              <h1>You're invited to join ${tenantName}</h1>
              <p>Hi ${firstName},</p>
              <p>${inviterName} has invited you to join ${tenantName} as a ${role}.</p>
              <p><a href="${inviteUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accept Invitation</a></p>
              <p>Or copy and paste this link in your browser: ${inviteUrl}</p>
              <p>This invitation expires in 7 days.</p>
              <p>Best regards,<br>The ${tenantName} Team</p>
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
      console.log('Email not sent - missing RESEND_API_KEY or SITE_URL configuration');
    }

    // If email failed to send, update status to 'failed'
    if (resendApiKey && siteUrl && !emailSent) {
      await supabase
        .from('user_invitations')
        .update({ 
          status: 'failed',
          metadata: {
            ...invitationData.metadata,
            email_error: emailError
          }
        })
        .eq('id', invitation.id);
    }

    // Return success response
    const response = {
      success: true,
      invitationId: invitation.id,
      message: 'Invitation created successfully',
      emailSent: emailSent,
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
