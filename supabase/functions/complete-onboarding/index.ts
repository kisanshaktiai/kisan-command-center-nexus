
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workflowId } = await req.json();
    
    if (!workflowId) {
      return new Response(
        JSON.stringify({ error: 'Workflow ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Completing onboarding workflow:', workflowId);

    // Check if all required steps are completed
    const { data: steps, error: stepsError } = await supabase
      .from('onboarding_steps')
      .select('*')
      .eq('workflow_id', workflowId);

    if (stepsError) {
      console.error('Error fetching steps:', stepsError);
      throw stepsError;
    }

    const incompleteSteps = steps.filter(step => 
      step.step_status === 'pending' || step.step_status === 'failed'
    );

    if (incompleteSteps.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Cannot complete onboarding: some steps are still incomplete',
          incomplete_steps: incompleteSteps.map(s => s.step_name)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark workflow as completed
    const { data: workflow, error: updateError } = await supabase
      .from('onboarding_workflows')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', workflowId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating workflow:', updateError);
      throw updateError;
    }

    // Get tenant information for notifications
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', workflow.tenant_id)
      .single();

    if (tenantError) {
      console.error('Error fetching tenant:', tenantError);
      // Don't throw here, just log the error
    }

    // Log completion event
    console.log(`Onboarding completed for tenant ${workflow.tenant_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        workflow,
        message: 'Onboarding completed successfully!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in complete-onboarding:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
