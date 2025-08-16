
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
    const { step_id, status, step_data = {}, completed_by } = await req.json();

    if (!step_id || !status) {
      return new Response(
        JSON.stringify({ error: "step_id and status are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate status
    const validStatuses = ['not_started', 'in_progress', 'completed', 'failed', 'skipped'];
    if (!validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ error: "Invalid status. Must be one of: " + validStatuses.join(', ') }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Updating onboarding step:", step_id, "to status:", status);

    // Prepare update data
    const updateData: any = {
      step_status: status,
      step_data: { ...step_data, updated_by: user.id },
      updated_at: new Date().toISOString()
    };

    // Set completion data if status is completed
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
      updateData.completed_by = completed_by || user.id;
    } else if (status === 'not_started' || status === 'in_progress') {
      // Clear completion data for non-completed statuses
      updateData.completed_at = null;
      updateData.completed_by = null;
    }

    // Update the onboarding step
    const { data: updatedStep, error: updateError } = await supabase
      .from("onboarding_steps")
      .update(updateData)
      .eq("id", step_id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    console.log("Step updated successfully:", updatedStep.id);

    // Get the workflow ID and check if we need to update workflow progress
    const workflowId = updatedStep.workflow_id;

    // Calculate current progress
    const { data: allSteps, error: stepsError } = await supabase
      .from("onboarding_steps")
      .select("step_status, onboarding_step_templates(required)")
      .eq("workflow_id", workflowId);

    if (stepsError) {
      console.error("Error fetching steps for progress calculation:", stepsError);
    } else {
      const completedSteps = allSteps.filter(step => 
        step.step_status === 'completed' || step.step_status === 'skipped'
      ).length;
      const totalSteps = allSteps.length;
      const requiredSteps = allSteps.filter(step => 
        step.onboarding_step_templates?.required !== false
      );
      const completedRequiredSteps = requiredSteps.filter(step => 
        step.step_status === 'completed' || step.step_status === 'skipped'
      ).length;

      // Update workflow current step and status
      const workflowUpdateData: any = {
        current_step: completedSteps,
        updated_at: new Date().toISOString()
      };

      // Check if all required steps are completed
      if (completedRequiredSteps === requiredSteps.length && requiredSteps.length > 0) {
        workflowUpdateData.status = 'completed';
        workflowUpdateData.completed_at = new Date().toISOString();
      } else if (completedSteps > 0) {
        workflowUpdateData.status = 'in_progress';
      }

      // Update workflow progress
      const { error: workflowUpdateError } = await supabase
        .from("onboarding_workflows")
        .update(workflowUpdateData)
        .eq("id", workflowId);

      if (workflowUpdateError) {
        console.error("Error updating workflow progress:", workflowUpdateError);
        // Don't fail the request if workflow update fails
      }
    }

    // Log the admin action for audit trail
    await supabase
      .from("admin_audit_logs")
      .insert({
        admin_id: user.id,
        action: "onboarding_step_updated",
        details: {
          step_id,
          new_status: status,
          workflow_id: workflowId,
          step_data: step_data
        },
        created_at: new Date().toISOString()
      });

    return new Response(
      JSON.stringify({
        success: true,
        step: updatedStep,
        message: `Step ${status === 'completed' ? 'completed' : 'updated'} successfully`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error in update-onboarding-step:", error);
    return handleError(error);
  }
});
