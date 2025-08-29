
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body to get the original parameters
    const body = await req.json();
    
    console.log('Deprecated send-user-invite called, redirecting to send-team-invite');
    console.log('Original request body:', body);
    
    // Get the authorization header to forward
    const authHeader = req.headers.get('authorization');
    const apiKeyHeader = req.headers.get('apikey');
    
    // Transform the old request format to new format if needed
    const transformedBody = {
      tenantId: body.tenantId || body.tenant_id,
      email: body.email,
      firstName: body.firstName || body.first_name || '',
      lastName: body.lastName || body.last_name || '',
      role: body.role || 'tenant_user',
      tenantName: body.tenantName || body.tenant_name,
      inviterName: body.inviterName || body.inviter_name,
      userId: body.userId || body.user_id
    };
    
    console.log('Transformed request body:', transformedBody);
    
    // Forward the request to the new send-team-invite function
    const newFunctionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-team-invite`;
    
    const forwardHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...corsHeaders
    };
    
    if (authHeader) {
      forwardHeaders['authorization'] = authHeader;
    }
    
    if (apiKeyHeader) {
      forwardHeaders['apikey'] = apiKeyHeader;
    }
    
    const response = await fetch(newFunctionUrl, {
      method: 'POST',
      headers: forwardHeaders,
      body: JSON.stringify(transformedBody)
    });
    
    const responseData = await response.json();
    
    console.log('Response from send-team-invite:', responseData);
    
    return new Response(JSON.stringify(responseData), {
      status: response.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
    
  } catch (error) {
    console.error('Error in deprecated send-user-invite function:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'This function has been deprecated. Please use send-team-invite instead. Error: ' + error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
};

serve(handler);
