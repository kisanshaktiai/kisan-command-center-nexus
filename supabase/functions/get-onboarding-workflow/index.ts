
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
    const { tenantId } = await req.json();
    
    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'Tenant ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching onboarding workflow for tenant:', tenantId);

    // Get or create workflow using the database function
    const { data: workflowId, error: workflowError } = await supabase
      .rpc('get_or_create_onboarding_workflow', { p_tenant_id: tenantId });

    if (workflowError) {
      console.error('Error getting/creating workflow:', workflowError);
      throw workflowError;
    }

    // Fetch the complete workflow
    const { data: workflow, error: fetchError } = await supabase
      .from('onboarding_workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (fetchError) {
      console.error('Error fetching workflow:', fetchError);
      throw fetchError;
    }

    // Fetch all steps for this workflow
    const { data: steps, error: stepsError } = await supabase
      .from('onboarding_steps')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('step_number');

    if (stepsError) {
      console.error('Error fetching steps:', stepsError);
      throw stepsError;
    }

    // Fetch step templates for reference
    const { data: templates, error: templatesError } = await supabase
      .from('onboarding_step_templates')
      .select('*')
      .eq('is_active', true)
      .order('step_order');

    if (templatesError) {
      console.error('Error fetching templates:', templatesError);
      throw templatesError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        workflow,
        steps,
        templates
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-onboarding-workflow:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
