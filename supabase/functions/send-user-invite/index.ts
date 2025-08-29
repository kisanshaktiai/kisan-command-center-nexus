import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(JSON.stringify({ 
    success: false, 
    error: 'This function has been deprecated. Please use send-team-invite instead.' 
  }), {
    status: 410, // Gone
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
};

serve(handler);
