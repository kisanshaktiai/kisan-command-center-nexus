
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AdvanceStepRequest {
  stepId: string;
  newStatus: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  stepData?: any;
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

    const { stepId, newStatus, stepData = {} }: AdvanceStepRequest = await req.json();

    console.log('Advancing step:', { stepId, newStatus });

    // Validate inputs
    if (!stepId || !newStatus) {
      throw new Error('Step ID and new status are required');
    }

    const validStatuses = ['pending', 'in_progress', 'completed', 'skipped', 'failed'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    // Get the current step
    const { data: currentStep, error: stepError } = await supabase
      .from('onboarding_steps')
      .select('*')
      .eq('id', stepId)
      .single();

    if (stepError || !currentStep) {
      console.error('Step not found:', stepError);
      throw new Error('Onboarding step not found');
    }

    // Update the step
    const { data: updatedStep, error: updateError } = await supabase
      .from('onboarding_steps')
      .update({
        step_status: newStatus,
        step_data: { ...currentStep.step_data, ...stepData },
        updated_at: new Date().toISOString()
      })
      .eq('id', stepId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating step:', updateError);
      throw new Error(`Failed to update step: ${updateError.message}`);
    }

    // Update workflow progress if step is completed
    if (newStatus === 'completed') {
      const { data: allSteps } = await supabase
        .from('onboarding_steps')
        .select('step_status')
        .eq('workflow_id', currentStep.workflow_id);

      if (allSteps) {
        const completedSteps = allSteps.filter(s => s.step_status === 'completed').length;
        const nextStep = allSteps.find(s => s.step_status === 'pending');
        
        await supabase
          .from('onboarding_workflows')
          .update({
            current_step: nextStep ? currentStep.step_number + 1 : currentStep.step_number,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentStep.workflow_id);
      }
    }

    console.log('Step updated successfully:', updatedStep.id);

    return new Response(
      JSON.stringify({
        success: true,
        step: updatedStep
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('Error in advance-step function:', error);
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
