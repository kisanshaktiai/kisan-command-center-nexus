
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.1";
import { corsHeaders } from "../_shared/cors.ts";
import { handleError } from "../_shared/errorHandler.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the user is authenticated and has admin privileges
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the JWT token and verify admin privileges
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: adminUser, error: adminError } = await supabase
      .from("admin_users")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    if (adminError || !adminUser || !adminUser.is_active) {
      return new Response(
        JSON.stringify({ error: "Admin privileges required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { tenant_id } = await req.json();

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: "tenant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Fetching onboarding workflow for tenant:", tenant_id);

    // Fetch the onboarding workflow with tenant details
    const { data: workflow, error: workflowError } = await supabase
      .from("onboarding_workflows")
      .select(`
        *,
        tenants!inner(
          name,
          status,
          type,
          subscription_plan
        )
      `)
      .eq("tenant_id", tenant_id)
      .single();

    if (workflowError) {
      if (workflowError.code === "PGRST116") {
        return new Response(
          JSON.stringify({ error: "Onboarding workflow not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw workflowError;
    }

    // Fetch all onboarding steps for this workflow with templates
    const { data: steps, error: stepsError } = await supabase
      .from("onboarding_steps")
      .select(`
        *,
        onboarding_step_templates(
          name,
          description,
          required,
          estimated_time_minutes,
          validation_rules
        )
      `)
      .eq("workflow_id", workflow.id)
      .order("step_number");

    if (stepsError) {
      throw stepsError;
    }

    console.log(`Found ${steps?.length || 0} steps for workflow ${workflow.id}`);

    // Combine workflow with steps
    const workflowWithSteps = {
      ...workflow,
      onboarding_steps: steps || []
    };

    return new Response(
      JSON.stringify(workflowWithSteps),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error in get-onboarding-workflow:", error);
    return handleError(error);
  }
});
