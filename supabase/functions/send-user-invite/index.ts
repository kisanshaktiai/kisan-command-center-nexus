
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
    console.log('🔍 CORS preflight request received');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== 🚀 SEND-USER-INVITE FUNCTION STARTED ===');
    console.log('📝 Request method:', req.method);
    console.log('📝 Request URL:', req.url);
    console.log('📝 Request headers:', Object.fromEntries(req.headers.entries()));
    
    // 🔧 CRITICAL DEBUG: Check Service Role Key availability
    console.log('🔍 === SERVICE ROLE KEY CHECK ===');
    console.log('🔍 SUPABASE_SERVICE_ROLE_KEY exists:', !!SUPABASE_SERVICE_ROLE_KEY);
    console.log('🔍 SUPABASE_SERVICE_ROLE_KEY length:', SUPABASE_SERVICE_ROLE_KEY?.length || 0);
    console.log('🔍 SUPABASE_SERVICE_ROLE_KEY starts with:', SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...');
    
    // Validate Service Role Key is available
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ CRITICAL: SUPABASE_SERVICE_ROLE_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Service configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    console.log('✅ Service Role Key is configured');

    // 🔧 CRITICAL DEBUG: Create Supabase client and test connection
    console.log('🔍 === SUPABASE CLIENT CREATION ===');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    console.log('✅ Supabase client created with Service Role Key');
    
    // Test the connection immediately
    console.log('🔍 Testing Supabase connection...');
    try {
      const { data: testData, error: testError } = await supabase
        .from('admin_users')
        .select('id')
        .limit(1);
      
      console.log('📊 Connection test result:', { data: testData, error: testError });
      
      if (testError) {
        console.error('❌ CRITICAL: Supabase connection failed:', testError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Database connection failed',
            details: testError.message 
          }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      console.log('✅ Supabase connection successful');
    } catch (connectionError) {
      console.error('❌ CRITICAL: Connection test exception:', connectionError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Database connection exception',
          details: connectionError.message 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    
    // Get inviter user ID from header
    const inviterUserId = req.headers.get('user-id');
    console.log('🔍 === USER AUTHENTICATION CHECK ===');
    console.log('📝 Raw user-id header:', inviterUserId);
    console.log('📝 user-id header exists:', !!inviterUserId);
    console.log('📝 user-id header length:', inviterUserId?.length || 0);
    
    if (!inviterUserId) {
      console.error('❌ No user-id header provided');
      return new Response(
        JSON.stringify({ success: false, error: 'User ID required in header' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(inviterUserId)) {
      console.error('❌ Invalid UUID format for user-id:', inviterUserId);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid User ID format' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    console.log('✅ Valid user ID format:', inviterUserId);
    
    // Parse request body
    let requestBody: InviteRequest;
    try {
      const rawBody = await req.text();
      console.log('📄 Raw request body:', rawBody);
      requestBody = JSON.parse(rawBody) as InviteRequest;
      console.log('✅ Parsed request body:', {
        tenantId: requestBody.tenantId,
        email: requestBody.email,
        firstName: requestBody.firstName,
        lastName: requestBody.lastName,
        role: requestBody.role,
        tenantName: requestBody.tenantName,
        inviterName: requestBody.inviterName
      });
    } catch (parseError) {
      console.error('❌ Error parsing request body:', parseError);
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
    console.log('🔍 === FIELD VALIDATION ===');
    if (!tenantId || !email || !firstName || !role) {
      const missingFields = [];
      if (!tenantId) missingFields.push('tenantId');
      if (!email) missingFields.push('email');
      if (!firstName) missingFields.push('firstName');
      if (!role) missingFields.push('role');
      
      console.error('❌ Missing required fields:', missingFields);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Missing required fields: ${missingFields.join(', ')}` 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    console.log('✅ All required fields validated');

    // Validate email format
    console.log('🔍 Validating email format...');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('❌ Invalid email format:', email);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email format' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    console.log('✅ Email format is valid');

    // Verify tenant exists
    console.log('🔍 === TENANT VERIFICATION ===');
    console.log('🔍 Querying tenants table for ID:', tenantId);
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', tenantId)
      .single();

    console.log('📊 Tenant query result:', { data: tenantData, error: tenantError });

    if (tenantError || !tenantData) {
      console.error('❌ Tenant verification failed:', tenantError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Tenant does not exist or access denied' 
        }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    console.log('✅ Tenant verified:', tenantData);

    // Get admin user record for the inviter
    console.log('🔍 === ADMIN USER VERIFICATION ===');
    console.log('🔍 Querying admin_users table for ID:', inviterUserId);
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email, full_name')
      .eq('id', inviterUserId)
      .single();

    console.log('📊 Admin user query result:', { data: adminUser, error: adminError });

    if (adminError || !adminUser) {
      console.error('❌ Admin user not found:', adminError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Inviter is not authorized as admin' 
        }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    console.log('✅ Admin user verified:', adminUser);

    // Generate unique invitation token
    console.log('🔍 === TOKEN GENERATION START ===');
    let invitationToken: string = crypto.randomUUID();
    let tokenIsUnique = false;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (!tokenIsUnique && attempts < maxAttempts) {
      console.log(`🔍 Checking token uniqueness, attempt ${attempts + 1}:`, invitationToken);
      
      const { data: existingToken, error: tokenCheckError } = await supabase
        .from('user_invitations')
        .select('id')
        .eq('invitation_token', invitationToken)
        .maybeSingle();
      
      console.log('📊 Token check result:', { data: existingToken, error: tokenCheckError });
      
      if (tokenCheckError) {
        console.log('⚠️ Token check error:', tokenCheckError.message);
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

    if (!tokenIsUnique) {
      console.error('❌ Failed to generate unique token after', maxAttempts, 'attempts');
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to generate unique invitation token' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    console.log('🔍 === TOKEN GENERATION END ===');

    // Check for existing active invitations
    console.log('🔍 === DUPLICATE INVITATION CHECK ===');
    console.log('🔍 Query params - tenantId:', tenantId, 'email:', email.toLowerCase().trim());
    
    const { data: existingInvites, error: checkError } = await supabase
      .from('user_invitations')
      .select('id, email, status')
      .eq('tenant_id', tenantId)
      .eq('email', email.toLowerCase().trim())
      .in('status', ['pending', 'sent']);

    console.log('📊 Existing invites check result:', { data: existingInvites, error: checkError });

    if (checkError) {
      console.error('❌ Error checking existing invitations:', checkError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to check existing invitations' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (existingInvites && existingInvites.length > 0) {
      console.log('⚠️ Found existing invitation:', existingInvites[0]);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'An active invitation for this email already exists' 
        }),
        { status: 409, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    console.log('✅ No existing active invitations found');

    // Prepare invitation data
    const invitationData = {
      tenant_id: tenantId,
      email: email.toLowerCase().trim(),
      first_name: firstName,
      last_name: lastName || '',
      role: role,
      invitation_token: invitationToken,
      invitation_type: 'tenant_activation',
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

    console.log('🔍 === DATABASE INSERTION ===');
    console.log('📝 Insert data:', JSON.stringify(invitationData, null, 2));

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
            errorHint: insertError.hint
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
        console.log('📧 Attempting to send invitation email...');
        
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
          console.log('✅ Email sent successfully');
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
          console.error('❌ Failed to send email:', errorText);
          emailError = errorText;
        }
      } catch (error) {
        console.error('❌ Error sending email:', error);
        emailError = error.message;
      }
    } else {
      console.log('📧 Email not sent - RESEND_API_KEY not configured');
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
    console.log('=== 🎉 SEND-USER-INVITE FUNCTION COMPLETED SUCCESSFULLY ===');

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
