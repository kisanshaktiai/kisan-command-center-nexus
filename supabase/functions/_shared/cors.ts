
// supabase/functions/_shared/cors.ts

const allowedOrigins = [
  "https://f7f3ec00-3a42-4b69-b48b-a0622a7f7b10.lovableproject.com",
  "https://f7f3ec00-3a42-4b69-b48b-a0622a7f7b10.sandbox.lovable.dev",
  "http://localhost:3000"
];

export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');
  const allowedOrigin = allowedOrigins.includes(origin || '') ? origin : allowedOrigins[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin || "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, referrer-policy",
  };
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, referrer-policy",
};

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }
  return null;
}
