
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
    const { stepId, stepData, status } = await req.json();
    
    if (!stepId) {
      return new Response(
        JSON.stringify({ error: 'Step ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Updating onboarding step:', stepId, 'with status:', status);

    // Use the database function to update the step
    const { data: result, error } = await supabase
      .rpc('advance_onboarding_step', {
        p_step_id: stepId,
        p_new_status: status || 'in_progress',
        p_step_data: stepData || {}
      });

    if (error) {
      console.error('Error updating step:', error);
      throw error;
    }

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the updated step to return
    const { data: updatedStep, error: fetchError } = await supabase
      .from('onboarding_steps')
      .select('*')
      .eq('id', stepId)
      .single();

    if (fetchError) {
      console.error('Error fetching updated step:', fetchError);
      throw fetchError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        step: updatedStep,
        workflow_updated: result.workflow_updated,
        is_completed: result.is_completed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in update-onboarding-step:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
