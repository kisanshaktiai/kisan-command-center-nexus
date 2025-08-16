
// supabase/functions/_shared/errorHandler.ts
import { corsHeaders } from "./cors.ts";

export function handleError(error: unknown, status = 500): Response {
  console.error("[EdgeFunctionError]", error);

  let message = "Unexpected error occurred";
  let details: string | undefined;

  if (error instanceof Error) {
    message = error.message;
    details = error.stack;
  } else if (typeof error === "string") {
    message = error;
  }

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
