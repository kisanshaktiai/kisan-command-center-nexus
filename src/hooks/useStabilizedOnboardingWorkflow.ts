
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';
import { OnboardingDataService } from '@/services/OnboardingDataService';

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

interface UseStabilizedOnboardingWorkflowOptions {
  tenantId: string;
  workflowId?: string;
  autoCreate?: boolean;
}

export const useStabilizedOnboardingWorkflow = ({
  tenantId,
  workflowId,
  autoCreate = true
}: UseStabilizedOnboardingWorkflowOptions) => {
  const [workflow, setWorkflow] = useState<OnboardingWorkflow | null>(null);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useNotifications();

  const createWorkflow = useCallback(async (): Promise<OnboardingWorkflow | null> => {
    try {
      console.log('Creating workflow for tenant:', tenantId);
      
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
        return newWorkflow;
      } else {
        throw new Error(data?.error || 'Failed to create workflow');
      }
    } catch (error: any) {
      console.error('Error creating workflow:', error);
      setError(error.message);
      throw error;
    }
  }, [tenantId]);

  const loadWorkflow = useCallback(async (workflowId: string): Promise<OnboardingWorkflow | null> => {
    try {
      const { data, error } = await supabase
        .from('onboarding_workflows')
        .select('id, tenant_id, status, current_step, total_steps')
        .eq('id', workflowId)
        .single();

      if (error) throw error;
      
      setWorkflow(data);
      return data;
    } catch (error: any) {
      console.error('Error loading workflow:', error);
      throw error;
    }
  }, []);

  const loadSteps = useCallback(async (workflowId: string): Promise<OnboardingStep[]> => {
    try {
      const { data, error } = await supabase
        .from('onboarding_steps')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('step_number');

      if (error) throw error;

      if (!data || data.length === 0) {
        console.warn('No steps found for workflow:', workflowId);
        return [];
      }

      setSteps(data);
      return data;
    } catch (error: any) {
      console.error('Error loading steps:', error);
      throw error;
    }
  }, []);

  const initialize = useCallback(async () => {
    if (!tenantId) return;

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
      console.error('Initialization failed:', error);
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

      // Save step data to business tables if completing
      if (status === 'completed') {
        const saveResult = await OnboardingDataService.saveStepData({
          stepName: stepToUpdate.step_name,
          stepData,
          tenantId,
          workflowId: workflow.id
        });

        if (!saveResult.success) {
          console.warn('Failed to save to business tables:', saveResult.error || saveResult.message);
          showError('Warning: ' + (saveResult.error || saveResult.message));
          // Continue with workflow update even if business table save fails
        }
      }

      // Update the step status in the workflow
      const { error } = await supabase
        .from('onboarding_steps')
        .update({
          step_status: status,
          step_data: { ...stepToUpdate.step_data, ...stepData },
          updated_at: new Date().toISOString()
        })
        .eq('id', stepToUpdate.id);

      if (error) {
        throw new Error(`Failed to update step: ${error.message}`);
      }

      // Update local state
      setSteps(currentSteps => 
        currentSteps.map(step => 
          step.step_number === stepNumber 
            ? { ...step, step_status: status, step_data: { ...step.step_data, ...stepData } }
            : step
        )
      );

    } catch (error: any) {
      console.error('Error updating step:', error);
      throw error;
    }
  }, [workflow?.id, steps, tenantId, showError]);

  const normalizeStepName = useCallback((stepName: string) => {
    return stepName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }, []);

  useEffect(() => {
    if (tenantId) {
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
    retryInitialization,
    normalizeStepName
  };
};
