

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteUserRequest {
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantName?: string;
  inviterName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== send-user-invite function started ===');
    
    // Initialize environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const siteUrl = Deno.env.get('SITE_URL');

    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasResendKey: !!resendApiKey,
      hasSiteUrl: !!siteUrl
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    // Extract JWT token from Authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('No authorization header found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Authentication required. Please log in and try again.' 
        }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Extracted JWT token (first 20 chars):', token.substring(0, 20) + '...');

    // Create two Supabase clients:
    // 1. User client with JWT for authentication
    // 2. Service role client for database operations
    const userSupabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || '', {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let requestBody: InviteUserRequest;
    try {
      requestBody = await req.json();
      console.log('Parsed request body:', {
        tenantId: requestBody.tenantId,
        email: requestBody.email,
        role: requestBody.role,
        firstName: requestBody.firstName,
        lastName: requestBody.lastName
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
      tenantName = 'KisanShakti Platform',
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

    // Get current user using the user client
    console.log('Getting authenticated user...');
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    
    if (authError) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Authentication failed: ' + authError.message 
        }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!user) {
      console.error('No authenticated user found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Authentication required to send invitations' 
        }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Authenticated user:', { id: user.id, email: user.email });

    // Verify tenant exists using service client
    console.log('Verifying tenant exists...');
    const { data: tenant, error: tenantError } = await serviceSupabase
      .from('tenants')
      .select('id, name')
      .eq('id', tenantId)
      .single();

    if (tenantError) {
      console.error('Tenant verification error:', tenantError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Tenant not found: ' + tenantError.message 
        }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Tenant verified:', { id: tenant.id, name: tenant.name });

    // Check for existing invitation using service client
    console.log('Checking for existing invitations...');
    const { data: existingInvites, error: checkError } = await serviceSupabase
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
          error: 'Failed to check existing invitations: ' + checkError.message 
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

    // Generate invitation token
    const invitationToken = crypto.randomUUID();
    console.log('Generated invitation token:', invitationToken.substring(0, 8) + '...');

    // Prepare invitation data with direct columns (NOT in metadata)
    const invitationData = {
      tenant_id: tenantId,
      email: email.toLowerCase().trim(),
      created_by: user.id,
      invitation_type: 'onboarding',
      status: 'pending',
      invitation_token: invitationToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      // These are direct columns in the user_invitations table
      first_name: firstName,
      last_name: lastName || '',
      role: role,
      tenant_name: tenantName,
      inviter_name: inviterName,
      // Only put additional metadata in the metadata JSONB field
      metadata: {
        invitation_source: 'onboarding_step',
        created_from: 'tenant_onboarding'
      }
    };

    console.log('Inserting invitation with data structure:', {
      tenant_id: invitationData.tenant_id,
      email: invitationData.email,
      created_by: invitationData.created_by,
      invitation_type: invitationData.invitation_type,
      status: invitationData.status,
      first_name: invitationData.first_name,
      last_name: invitationData.last_name,
      role: invitationData.role,
      tenant_name: invitationData.tenant_name,
      inviter_name: invitationData.inviter_name,
      metadata_keys: Object.keys(invitationData.metadata)
    });

    // Insert invitation record using service client
    const { data: invitation, error: inviteError } = await serviceSupabase
      .from('user_invitations')
      .insert(invitationData)
      .select()
      .single();

    if (inviteError) {
      console.error('Database insertion error:', {
        message: inviteError.message,
        details: inviteError.details,
        hint: inviteError.hint,
        code: inviteError.code
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to create invitation: ${inviteError.message}`,
          details: inviteError.details,
          code: inviteError.code
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Invitation created successfully:', { id: invitation.id });

    // Send email if Resend is configured
    if (resendApiKey && siteUrl) {
      try {
        const resend = new Resend(resendApiKey);
        const inviteUrl = `${siteUrl}/auth?invite=${invitationToken}`;

        console.log('Sending email invitation...');
        const emailResponse = await resend.emails.send({
          from: "KisanShakti <admin@kisanshaktiai.in>",
          to: [email],
          subject: `You're invited to join ${tenantName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>You're invited to join ${tenantName}!</h2>
              <p>Hello ${firstName},</p>
              <p>${inviterName} has invited you to join ${tenantName} as a ${role}.</p>
              <p>Click the link below to accept your invitation:</p>
              <a href="${inviteUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">
                Accept Invitation
              </a>
              <p>This invitation will expire in 7 days.</p>
              <p>If you have any questions, please contact your administrator.</p>
              <hr>
              <p style="color: #666; font-size: 12px;">This invitation was sent from KisanShakti Platform.</p>
            </div>
          `
        });

        if (emailResponse.error) {
          console.error('Email sending error:', emailResponse.error);
          
          // Update invitation status to failed but preserve existing metadata
          await serviceSupabase
            .from('user_invitations')
            .update({ 
              status: 'failed',
              metadata: { 
                ...invitationData.metadata,
                email_error: emailResponse.error.message 
              }
            })
            .eq('id', invitation.id);

          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Invitation created but email failed: ${emailResponse.error.message}` 
            }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        console.log('Email sent successfully:', emailResponse.data?.id);

        // Update invitation status to sent
        await serviceSupabase
          .from('user_invitations')
          .update({ 
            status: 'sent', 
            sent_at: new Date().toISOString() 
          })
          .eq('id', invitation.id);

        return new Response(
          JSON.stringify({
            success: true,
            invitation_id: invitation.id,
            email_id: emailResponse.data?.id,
            message: 'Invitation sent successfully'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );

      } catch (emailError) {
        console.error('Email service error:', emailError);
        
        // Update invitation status but don't fail the request, preserve existing metadata
        await serviceSupabase
          .from('user_invitations')
          .update({ 
            status: 'failed',
            metadata: { 
              ...invitationData.metadata,
              email_error: emailError instanceof Error ? emailError.message : 'Unknown email error'
            }
          })
          .eq('id', invitation.id);

        return new Response(
          JSON.stringify({
            success: true,
            invitation_id: invitation.id,
            message: 'Invitation created but email sending failed',
            warning: 'Email could not be sent'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    } else {
      console.log('Email not configured, invitation created without sending email');
      
      return new Response(
        JSON.stringify({
          success: true,
          invitation_id: invitation.id,
          message: 'Invitation created successfully (email not configured)'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

  } catch (error: any) {
    console.error('Unexpected error in send-user-invite function:', {
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
