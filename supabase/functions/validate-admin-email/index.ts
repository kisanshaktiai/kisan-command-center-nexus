
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const rawEmail = (body?.email || "").toString().trim();

    // Basic email format validation (same pattern as frontend)
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

    if (!rawEmail) {
      return new Response(
        JSON.stringify({ valid: false, error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!emailRegex.test(rawEmail)) {
      console.log("❌ Invalid email format received:", rawEmail);
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailLower = rawEmail.toLowerCase();
    console.log("🔎 Checking admin email existence:", emailLower);

    // Check if email exists in auth.users table (case-insensitive)
    const { count, error } = await supabase
      .from("auth.users")
      .select("id", { head: true, count: "exact" })
      .ilike("email", emailLower);

    if (error) {
      console.error("💥 Admin email existence check failed:", error);
      return new Response(
        JSON.stringify({ valid: false, error: "Email check failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const exists = (count ?? 0) > 0;
    if (exists) {
      console.log("🚫 Email already exists in auth.users:", emailLower);
      return new Response(
        JSON.stringify({ 
          valid: true, 
          exists: true, 
          message: "This email already has a user account" 
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Admin email is available:", emailLower);
    return new Response(
      JSON.stringify({ valid: true, exists: false }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("💥 Unexpected error in validate-admin-email:", err);
    return new Response(
      JSON.stringify({ valid: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
