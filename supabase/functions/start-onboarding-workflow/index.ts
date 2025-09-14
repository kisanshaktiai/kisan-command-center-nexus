
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

    console.log('Starting template-based onboarding workflow for tenant:', tenantId);

    // Check if tenant exists
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name, subscription_plan, status, type')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      console.error('Tenant not found:', tenantError);
      throw new Error('Tenant not found');
    }

    console.log('Tenant found:', tenant.name, 'Plan:', tenant.subscription_plan, 'Type:', tenant.type);

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
        console.log('Found existing template-based workflow:', existingWorkflow.id);
        
        // Check if workflow has steps - if not, we need to recreate them
        const { data: existingSteps } = await supabase
          .from('onboarding_steps')
          .select('id')
          .eq('workflow_id', existingWorkflow.id);

        if (!existingSteps || existingSteps.length === 0) {
          console.log('Existing workflow has no steps, will recreate steps');
          workflow = existingWorkflow;
        } else {
          console.log('Existing workflow has', existingSteps.length, 'steps');
          return new Response(
            JSON.stringify({
              success: true,
              workflow_id: existingWorkflow.id,
              tenant_id: tenantId,
              status: existingWorkflow.status,
              current_step: existingWorkflow.current_step,
              total_steps: existingWorkflow.total_steps,
              template_source: 'database'
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            }
          );
        }
      }
    }

    // Get step templates from database
    console.log('Fetching onboarding step templates from database');
    const { data: stepTemplates, error: templatesError } = await supabase
      .from('onboarding_step_templates')
      .select('*')
      .order('step_number', { ascending: true });

    if (templatesError) {
      console.error('Failed to fetch step templates:', templatesError);
      throw new Error(`Failed to fetch step templates: ${templatesError.message}`);
    }

    if (!stepTemplates || stepTemplates.length === 0) {
      console.error('No step templates found in database');
      throw new Error('No onboarding step templates found in database');
    }

    console.log('Found', stepTemplates.length, 'step templates from database');

    // Filter templates based on tenant subscription plan and type if available
    const filteredTemplates = stepTemplates.filter(template => {
      // If template has specific subscription plans, check if tenant plan matches
      if (template.subscription_plans && Array.isArray(template.subscription_plans) && template.subscription_plans.length > 0) {
        if (!template.subscription_plans.includes(tenant.subscription_plan)) {
          return false;
        }
      }
      
      // If template has specific tenant types, check if tenant type matches
      if (template.tenant_types && Array.isArray(template.tenant_types) && template.tenant_types.length > 0) {
        if (!template.tenant_types.includes(tenant.type)) {
          return false;
        }
      }
      
      return true;
    });

    // Use all templates if filtering results in empty set
    const templatesToUse = filteredTemplates.length > 0 ? filteredTemplates : stepTemplates;
    console.log('Using', templatesToUse.length, 'filtered templates for tenant');

    // Create new workflow if needed
    if (!workflow) {
      console.log('Creating new template-based workflow for tenant:', tenantId);
      
      const { data: newWorkflow, error: workflowError } = await supabase
        .from('onboarding_workflows')
        .insert({
          tenant_id: tenantId,
          status: 'in_progress',
          current_step: 1,
          total_steps: templatesToUse.length,
          metadata: {
            tenant_name: tenant.name,
            subscription_plan: tenant.subscription_plan,
            tenant_type: tenant.type,
            created_by: req.headers.get('user-id') || 'system',
            template_source: 'database'
          }
        })
        .select()
        .single();

      if (workflowError) {
        console.error('Failed to create template-based workflow:', workflowError);
        throw new Error(`Failed to create workflow: ${workflowError.message}`);
      }

      workflow = newWorkflow;
      console.log('Successfully created template-based workflow:', workflow.id);
    }

    // Create steps from database templates
    const steps = templatesToUse.map(template => ({
      workflow_id: workflow.id,
      step_number: template.step_number,
      step_name: template.step_name,
      step_status: template.step_number === 1 ? 'in_progress' : 'pending',
      step_data: {
        estimated_time: template.estimated_time || 15,
        is_required: template.is_required !== false,
        help_text: template.help_text || '',
        default_data: template.default_data || {},
        validation_schema: template.validation_schema || {},
        template_id: template.id,
        template_version: template.version || 1
      },
      validation_errors: null,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    console.log('Creating', steps.length, 'steps from database templates for workflow:', workflow.id);

    // Delete any existing steps for this workflow first
    const { error: deleteError } = await supabase
      .from('onboarding_steps')
      .delete()
      .eq('workflow_id', workflow.id);

    if (deleteError) {
      console.error('Error deleting existing steps:', deleteError);
      // Continue anyway - this might be expected for new workflows
    }

    const { data: createdSteps, error: stepsError } = await supabase
      .from('onboarding_steps')
      .insert(steps)
      .select();

    if (stepsError) {
      console.error('Error creating steps from database templates:', stepsError);
      console.error('Steps data that failed to insert:', JSON.stringify(steps, null, 2));
      
      // Rollback: Delete the workflow if step creation fails
      await supabase
        .from('onboarding_workflows')
        .delete()
        .eq('id', workflow.id);
      
      throw new Error(`Failed to create onboarding steps from templates: ${stepsError.message}`);
    }

    console.log('Successfully created', createdSteps?.length || 0, 'steps from database templates');

    // Update workflow total_steps to match actual created steps
    if (createdSteps && createdSteps.length !== workflow.total_steps) {
      console.log('Updating workflow total_steps from', workflow.total_steps, 'to', createdSteps.length);
      await supabase
        .from('onboarding_workflows')
        .update({ total_steps: createdSteps.length })
        .eq('id', workflow.id);
      
      workflow.total_steps = createdSteps.length;
    }

    console.log('Template-based onboarding workflow ready:', workflow.id);

    return new Response(
      JSON.stringify({
        success: true,
        workflow_id: workflow.id,
        tenant_id: tenantId,
        status: workflow.status,
        current_step: workflow.current_step,
        total_steps: workflow.total_steps,
        steps_created: createdSteps?.length || 0,
        template_source: 'database'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('Error in template-based start-onboarding-workflow function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        template_source: 'database'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
};

serve(handler);
