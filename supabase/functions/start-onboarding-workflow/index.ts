
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
        console.log('Found existing workflow:', existingWorkflow.id);
        workflow = existingWorkflow;
      }
    }

    // Create new workflow if needed
    if (!workflow) {
      console.log('Creating new workflow for tenant:', tenantId);
      
      // Get step templates for this tenant type/subscription plan
      const { data: stepTemplates, error: templatesError } = await supabase
        .from('onboarding_step_templates')
        .select('*')
        .eq('is_active', true)
        .order('step_number', { ascending: true });

      if (templatesError) {
        console.error('Failed to fetch step templates:', templatesError);
        throw new Error(`Failed to fetch step templates: ${templatesError.message}`);
      }

      if (!stepTemplates || stepTemplates.length === 0) {
        console.error('No active step templates found');
        throw new Error('No active onboarding step templates found');
      }

      console.log('Found', stepTemplates.length, 'step templates');

      // Filter templates based on tenant subscription plan and type if needed
      const filteredTemplates = stepTemplates.filter(template => {
        // If template has specific subscription plans, check if tenant plan matches
        if (template.subscription_plans && template.subscription_plans.length > 0) {
          return template.subscription_plans.includes(tenant.subscription_plan);
        }
        // If template has specific tenant types, check if tenant type matches
        if (template.tenant_types && template.tenant_types.length > 0) {
          return template.tenant_types.includes(tenant.type);
        }
        // If no specific restrictions, include the template
        return true;
      });

      if (filteredTemplates.length === 0) {
        console.log('No templates match tenant criteria, using all templates');
        // Fall back to all templates if filtering results in empty set
        filteredTemplates.push(...stepTemplates);
      }

      console.log('Using', filteredTemplates.length, 'filtered templates for tenant');

      const { data: newWorkflow, error: workflowError } = await supabase
        .from('onboarding_workflows')
        .insert({
          tenant_id: tenantId,
          status: 'in_progress',
          current_step: 1,
          total_steps: filteredTemplates.length,
          metadata: {
            tenant_name: tenant.name,
            subscription_plan: tenant.subscription_plan,
            tenant_type: tenant.type,
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

      // Create steps from templates
      const steps = filteredTemplates.map(template => ({
        workflow_id: workflow.id,
        step_number: template.step_number,
        step_name: template.step_name,
        step_status: template.step_number === 1 ? 'in_progress' : 'pending',
        step_data: {
          estimated_time: template.estimated_time || 15,
          is_required: template.is_required || true,
          help_text: template.help_text || '',
          default_data: template.default_data || {},
          validation_schema: template.validation_schema || {}
        },
        validation_errors: null,
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      console.log('Creating', steps.length, 'steps for workflow:', workflow.id);

      const { data: createdSteps, error: stepsError } = await supabase
        .from('onboarding_steps')
        .insert(steps)
        .select();

      if (stepsError) {
        console.error('Error creating steps from templates:', stepsError);
        
        // Rollback: Delete the workflow if step creation fails
        await supabase
          .from('onboarding_workflows')
          .delete()
          .eq('id', workflow.id);
        
        throw new Error(`Failed to create onboarding steps from templates: ${stepsError.message}`);
      }

      console.log('Successfully created', createdSteps?.length || 0, 'steps from templates');
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
