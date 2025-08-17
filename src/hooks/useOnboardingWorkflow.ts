import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';

interface OnboardingWorkflow {
  id: string;
  tenant_id: string;
  status: string;
  current_step: number;
  total_steps: number;
}

interface OnboardingStep {
  id: string;
  workflow_id: string;
  step_number: number;
  step_name: string;
  step_status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  step_data: any;
}

interface UseOnboardingWorkflowOptions {
  tenantId: string;
  workflowId?: string;
  autoCreate?: boolean;
}

export const useOnboardingWorkflow = ({
  tenantId,
  workflowId,
  autoCreate = true
}: UseOnboardingWorkflowOptions) => {
  const [workflow, setWorkflow] = useState<OnboardingWorkflow | null>(null);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useNotifications();

  const createWorkflow = useCallback(async (): Promise<OnboardingWorkflow | null> => {
    try {
      console.log('🚀 Creating workflow for tenant:', tenantId);
      
      const { data, error } = await supabase.functions.invoke('start-onboarding-workflow', {
        body: { tenantId, forceNew: false }
      });

      if (error) {
        throw new Error(`Failed to create workflow: ${error.message}`);
      }

      if (data?.success) {
        const newWorkflow = {
          id: data.workflow_id,
          tenant_id: tenantId,
          status: data.status,
          current_step: data.current_step,
          total_steps: data.total_steps
        };
        
        setWorkflow(newWorkflow);
        showSuccess(`Workflow initialized with ${data.steps_created} steps`);
        return newWorkflow;
      } else {
        throw new Error(data?.error || 'Failed to create workflow');
      }
    } catch (error: any) {
      console.error('❌ Error creating workflow:', error);
      setError(error.message);
      throw error;
    }
  }, [tenantId, showSuccess]);

  const loadWorkflow = useCallback(async (workflowId: string): Promise<OnboardingWorkflow | null> => {
    try {
      console.log('📂 Loading workflow:', workflowId);
      
      const { data, error } = await supabase
        .from('onboarding_workflows')
        .select('id, tenant_id, status, current_step, total_steps')
        .eq('id', workflowId)
        .single();

      if (error) {
        throw error;
      }

      setWorkflow(data);
      return data;
    } catch (error: any) {
      console.error('❌ Error loading workflow:', error);
      throw error;
    }
  }, []);

  const loadSteps = useCallback(async (workflowId: string): Promise<OnboardingStep[]> => {
    try {
      console.log('📋 Loading steps for workflow:', workflowId);
      
      const { data, error } = await supabase
        .from('onboarding_steps')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('step_number');

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ No steps found for workflow:', workflowId);
        return [];
      }

      console.log('✅ Loaded steps:', data.length);
      setSteps(data);
      return data;
    } catch (error: any) {
      console.error('❌ Error loading steps:', error);
      throw error;
    }
  }, []);

  const initialize = useCallback(async () => {
    if (!tenantId) {
      console.log('❌ No tenant ID provided');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let workflowResult: OnboardingWorkflow | null = null;

      if (workflowId) {
        workflowResult = await loadWorkflow(workflowId);
      } else if (autoCreate) {
        workflowResult = await createWorkflow();
      }

      if (workflowResult) {
        await loadSteps(workflowResult.id);
      }

    } catch (error: any) {
      console.error('❌ Initialization failed:', error);
      setError(error.message || 'Failed to initialize workflow');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, workflowId, autoCreate, loadWorkflow, createWorkflow, loadSteps]);

  const retryInitialization = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    await initialize();
  }, [initialize]);

  const updateStepStatus = useCallback(async (
    stepNumber: number,
    status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed',
    stepData: any = {}
  ) => {
    if (!workflow?.id) {
      throw new Error('No workflow available');
    }

    try {
      const stepToUpdate = steps.find(s => s.step_number === stepNumber);
      if (!stepToUpdate) {
        throw new Error(`Step ${stepNumber} not found`);
      }

      // Use the database function with proper enum casting
      const { error } = await supabase.rpc('advance_onboarding_step', {
        p_step_id: stepToUpdate.id,
        p_new_status: status as any, // Cast to enum type
        p_step_data: stepData
      });

      if (error) {
        throw new Error(`Failed to update step: ${error.message}`);
      }

      setSteps(currentSteps => 
        currentSteps.map(step => 
          step.step_number === stepNumber 
            ? { ...step, step_status: status, step_data: { ...step.step_data, ...stepData } }
            : step
        )
      );

      showSuccess(`Step ${stepNumber} updated successfully`);
    } catch (error: any) {
      console.error('❌ Error updating step:', error);
      showError('Failed to update step status');
      throw error;
    }
  }, [workflow?.id, steps, showSuccess, showError]);

  useEffect(() => {
    if (tenantId) {
      console.log('🔄 Initializing workflow for tenant:', tenantId);
      initialize();
    } else {
      setIsLoading(false);
    }
  }, [tenantId, workflowId]);

  return {
    workflow,
    steps,
    isLoading,
    error,
    updateStepStatus,
    retryInitialization
  };
};
