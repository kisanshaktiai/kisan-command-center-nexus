
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

    // Generate invitation token
    const invitationToken = crypto.randomUUID();
    console.log('Generated invitation token for:', email);

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
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
    };

    console.log('Inserting invitation data:', {
      tenant_id: invitationData.tenant_id,
      email: invitationData.email,
      first_name: invitationData.first_name,
      last_name: invitationData.last_name,
      role: invitationData.role,
      status: invitationData.status
    });

    // Insert invitation record
    const { data: invitation, error: insertError } = await supabase
      .from('user_invitations')
      .insert(invitationData)
      .select('id')
      .single();

    if (insertError) {
      console.error('Database insertion error:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to create invitation: ${insertError.message}`
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Invitation created successfully with ID:', invitation.id);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        invitationId: invitation.id,
        message: 'Invitation created successfully'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

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
