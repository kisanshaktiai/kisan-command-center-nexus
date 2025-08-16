
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
    const { workflow_id } = await req.json();

    if (!workflow_id) {
      return new Response(
        JSON.stringify({ error: "workflow_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Completing onboarding workflow:", workflow_id);

    // Check if workflow exists and get current status
    const { data: workflow, error: workflowError } = await supabase
      .from("onboarding_workflows")
      .select("*, tenants(name)")
      .eq("id", workflow_id)
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

    if (workflow.status === 'completed') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Workflow is already completed",
          workflow: workflow
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify that all required steps are completed or skipped
    const { data: steps, error: stepsError } = await supabase
      .from("onboarding_steps")
      .select(`
        step_status,
        step_name,
        onboarding_step_templates(required)
      `)
      .eq("workflow_id", workflow_id);

    if (stepsError) {
      throw stepsError;
    }

    const requiredSteps = steps.filter(step => 
      step.onboarding_step_templates?.required !== false
    );
    
    const incompleteRequiredSteps = requiredSteps.filter(step => 
      !['completed', 'skipped'].includes(step.step_status)
    );

    if (incompleteRequiredSteps.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: "Cannot complete workflow: required steps are not completed",
          incomplete_steps: incompleteRequiredSteps.map(step => step.step_name)
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate final statistics
    const completedSteps = steps.filter(step => step.step_status === 'completed').length;
    const totalSteps = steps.length;

    // Complete the workflow
    const completedAt = new Date().toISOString();
    const { data: updatedWorkflow, error: updateError } = await supabase
      .from("onboarding_workflows")
      .update({
        status: 'completed',
        completed_at: completedAt,
        current_step: completedSteps,
        metadata: {
          ...workflow.metadata,
          completed_by: user.id,
          completion_date: completedAt,
          final_step_count: totalSteps,
          completed_step_count: completedSteps
        },
        updated_at: completedAt
      })
      .eq("id", workflow_id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    console.log("Workflow completed successfully:", workflow_id);

    // Update tenant status to active if it's not already
    if (workflow.tenants?.status !== 'active') {
      const { error: tenantUpdateError } = await supabase
        .from("tenants")
        .update({
          status: 'active',
          updated_at: completedAt
        })
        .eq("id", workflow.tenant_id);

      if (tenantUpdateError) {
        console.error("Error updating tenant status:", tenantUpdateError);
        // Don't fail the completion if tenant update fails
      }
    }

    // Log the admin action for audit trail
    await supabase
      .from("admin_audit_logs")
      .insert({
        admin_id: user.id,
        action: "onboarding_workflow_completed",
        details: {
          workflow_id,
          tenant_id: workflow.tenant_id,
          tenant_name: workflow.tenants?.name,
          total_steps: totalSteps,
          completed_steps: completedSteps,
          completion_date: completedAt
        },
        created_at: completedAt
      });

    // TODO: Send completion notification email to tenant
    // TODO: Trigger any post-onboarding automation

    return new Response(
      JSON.stringify({
        success: true,
        workflow: updatedWorkflow,
        message: `Onboarding workflow completed successfully for ${workflow.tenants?.name || 'tenant'}`,
        statistics: {
          total_steps: totalSteps,
          completed_steps: completedSteps,
          completion_rate: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error in complete-onboarding:", error);
    return handleError(error);
  }
});
