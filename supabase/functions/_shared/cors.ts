
// supabase/functions/_shared/cors.ts

// Load allowed origins dynamically from environment variable (comma-separated)
const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") || "*")
  .split(",")
  .map(o => o.trim());

export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  
  // Allow if origin is explicitly listed OR if "*" is configured
  const allowedOrigin = 
    allowedOrigins.includes("*") 
      ? origin || "*" 
      : allowedOrigins.includes(origin || "") 
        ? origin 
        : allowedOrigins[0]; // default to first configured one
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin || "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, referrer-policy",
  };
}

// Default fallback if used without request
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, referrer-policy",
};

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }
  return null;
}
