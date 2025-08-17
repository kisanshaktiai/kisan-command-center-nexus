
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StartWorkflowRequest {
  tenantId: string;
  forceNew?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { tenantId, forceNew = false }: StartWorkflowRequest = await req.json();

    console.log('Starting onboarding workflow for tenant:', tenantId);

    // Check if tenant exists
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name, subscription_plan, status')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      console.error('Tenant not found:', tenantError);
      throw new Error('Tenant not found');
    }

    console.log('Tenant found:', tenant.name);

    // Check for existing workflow
    let workflow = null;
    if (!forceNew) {
      const { data: existingWorkflow } = await supabase
        .from('onboarding_workflows')
        .select('*')
        .eq('tenant_id', tenantId)
        .neq('status', 'completed')
        .single();

      if (existingWorkflow) {
        console.log('Found existing workflow:', existingWorkflow.id);
        workflow = existingWorkflow;
      }
    }

    // Create new workflow if needed
    if (!workflow) {
      console.log('Creating new workflow for tenant:', tenantId);
      
      const { data: newWorkflow, error: workflowError } = await supabase
        .from('onboarding_workflows')
        .insert({
          tenant_id: tenantId,
          status: 'in_progress',
          current_step: 1,
          total_steps: 6,
          metadata: {
            tenant_name: tenant.name,
            subscription_plan: tenant.subscription_plan,
            created_by: req.headers.get('user-id') || 'system'
          }
        })
        .select()
        .single();

      if (workflowError) {
        console.error('Failed to create workflow:', workflowError);
        throw new Error(`Failed to create workflow: ${workflowError.message}`);
      }

      workflow = newWorkflow;
      console.log('Successfully created workflow:', workflow.id);

      // Create initial steps with explicit structure matching database schema
      const stepTemplates = [
        { step_number: 1, step_name: 'Company Profile' },
        { step_number: 2, step_name: 'Branding & Design' },
        { step_number: 3, step_name: 'Team & Permissions' },
        { step_number: 4, step_name: 'Billing & Plan' },
        { step_number: 5, step_name: 'Domain & White-label' },
        { step_number: 6, step_name: 'Review & Launch' }
      ];

      const steps = stepTemplates.map(template => ({
        workflow_id: workflow.id,
        step_number: template.step_number,
        step_name: template.step_name,
        step_status: template.step_number === 1 ? 'in_progress' : 'pending',
        step_data: {
          estimated_time: [15, 10, 20, 10, 15, 5][template.step_number - 1],
          is_required: [true, false, true, true, false, true][template.step_number - 1]
        }
      }));

      console.log('Creating steps for workflow:', workflow.id, 'Steps count:', steps.length);

      const { data: createdSteps, error: stepsError } = await supabase
        .from('onboarding_steps')
        .insert(steps)
        .select();

      if (stepsError) {
        console.error('Error creating steps:', stepsError);
        
        // Rollback: Delete the workflow if step creation fails
        await supabase
          .from('onboarding_workflows')
          .delete()
          .eq('id', workflow.id);
        
        throw new Error(`Failed to create onboarding steps: ${stepsError.message}`);
      }

      console.log('Successfully created steps:', createdSteps?.length || 0);
    } else {
      // For existing workflows, verify steps exist
      const { data: existingSteps, error: stepsCheckError } = await supabase
        .from('onboarding_steps')
        .select('id')
        .eq('workflow_id', workflow.id);

      if (stepsCheckError) {
        console.error('Error checking existing steps:', stepsCheckError);
      } else if (!existingSteps || existingSteps.length === 0) {
        console.log('Existing workflow has no steps, cleaning up and creating new workflow');
        
        // Clean up orphaned workflow
        await supabase
          .from('onboarding_workflows')
          .delete()
          .eq('id', workflow.id);
        
        // Recursively call to create new workflow
        return handler(req);
      } else {
        console.log('Existing workflow has', existingSteps.length, 'steps');
      }
    }

    console.log('Onboarding workflow ready:', workflow.id);

    return new Response(
      JSON.stringify({
        success: true,
        workflow_id: workflow.id,
        tenant_id: tenantId,
        status: workflow.status,
        current_step: workflow.current_step,
        total_steps: workflow.total_steps
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('Error in start-onboarding-workflow function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
};

serve(handler);
