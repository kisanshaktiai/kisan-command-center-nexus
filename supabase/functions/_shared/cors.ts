
// supabase/functions/_shared/cors.ts

export const corsHeaders = {
  // Restrict to your Lovable project + localhost for dev
  "Access-Control-Allow-Origin": [
    "https://f7f3ec00-3a42-4b69-b48b-a0622a7f7b10.lovableproject.com",
    "https://f7f3ec00-3a42-4b69-b48b-a0622a7f7b10.sandbox.lovable.dev",
    "http://localhost:3000"
  ].join(", "),
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, referrer-policy, x-requested-with, accept, origin, user-agent",
  "Access-Control-Max-Age": "86400",
};

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { 
      status: 200,
      headers: corsHeaders 
    });
  }
  return null;
}
