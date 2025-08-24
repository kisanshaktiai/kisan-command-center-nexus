
// supabase/functions/_shared/errorHandler.ts
import { getCorsHeaders } from "./cors.ts";

export function handleError(error: unknown, status = 500, request?: Request): Response {
  console.error("[EdgeFunctionError]", error);

  let message = "Unexpected error occurred";
  let details: string | undefined;

  if (error instanceof Error) {
    message = error.message;
    details = error.stack;
  } else if (typeof error === "string") {
    message = error;
  }

  const corsHeaders = request ? getCorsHeaders(request) : {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, referrer-policy",
  };

  return new Response(
    JSON.stringify({ error: message, details }),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
}
