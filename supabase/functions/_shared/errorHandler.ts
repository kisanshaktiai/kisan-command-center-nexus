// supabase/functions/_shared/errorHandler.ts
import { getCorsHeaders } from "./cors.ts";

export function handleError(error: unknown, status = 500, request?: Request): Response {
  console.error("[EdgeFunctionError]", error);

  const message =
    error instanceof Error ? error.message
    : typeof error === "string" ? error
    : "Unexpected error occurred";

  const details = error instanceof Error ? error.stack : undefined;

  const corsHeaders = request ? getCorsHeaders(request) : {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, referrer-policy, x-correlation-id",
  };

  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      details,
      correlationId: crypto.randomUUID(), // 🔑 trace each error
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
}
