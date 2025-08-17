
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';

interface OnboardingWorkflow {
  id: string;
  tenant_id: string;
  status: string;
  current_step: number;
  total_steps: number;
}

interface UseOptimizedOnboardingWorkflowOptions {
  tenantId: string;
  workflowId?: string;
  autoCreate?: boolean;
}

export const useOptimizedOnboardingWorkflow = ({
  tenantId,
  workflowId,
  autoCreate = true
}: UseOptimizedOnboardingWorkflowOptions) => {
  const [workflow, setWorkflow] = useState<OnboardingWorkflow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useNotifications();
  
  const initializationRef = useRef<{ attempted: boolean; promise: Promise<void> | null }>({
    attempted: false,
    promise: null
  });

  const createWorkflow = useCallback(async (): Promise<OnboardingWorkflow | null> => {
    try {
      console.log('Creating workflow for tenant:', tenantId);
      
      const { data, error } = await supabase.functions.invoke('start-onboarding-workflow', {
        body: { tenantId, forceNew: false }
      });

      if (error) {
        throw new Error(`Edge function error: ${error.message || 'Unknown error'}`);
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
        showSuccess(`Onboarding workflow initialized with ${data.steps_created} steps`);
        return newWorkflow;
      } else {
        throw new Error(data?.error || 'Failed to create workflow');
      }
    } catch (error: any) {
      console.error('Error creating workflow:', error);
      const errorMessage = error.message || 'Failed to initialize workflow';
      setError(errorMessage);
      throw error;
    }
  }, [tenantId, showSuccess]);

  const loadWorkflow = useCallback(async (workflowId: string): Promise<OnboardingWorkflow | null> => {
    try {
      console.log('Loading workflow:', workflowId);
      
      const { data, error } = await supabase
        .from('onboarding_workflows')
        .select('id, tenant_id, status, current_step, total_steps')
        .eq('id', workflowId)
        .single();

      if (error) {
        throw error;
      }

      // Verify workflow has steps
      const { data: steps, error: stepsError } = await supabase
        .from('onboarding_steps')
        .select('id')
        .eq('workflow_id', workflowId);

      if (stepsError) {
        console.error('Error checking workflow steps:', stepsError);
      } else if (!steps || steps.length === 0) {
        console.log('Workflow has no steps, recreating...');
        return await createWorkflow();
      }

      setWorkflow(data);
      return data;
    } catch (error: any) {
      console.error('Error loading workflow:', error);
      throw error;
    }
  }, [createWorkflow]);

  const initializeWorkflow = useCallback(async (): Promise<void> => {
    if (!tenantId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Small delay to prevent race conditions
      await new Promise(resolve => setTimeout(resolve, 100));

      if (workflowId) {
        await loadWorkflow(workflowId);
      } else if (autoCreate) {
        await createWorkflow();
      } else {
        setWorkflow(null);
      }
    } catch (error: any) {
      console.error('Workflow initialization failed:', error);
      setError(error.message || 'Failed to initialize workflow');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, workflowId, autoCreate, loadWorkflow, createWorkflow]);

  const retryInitialization = useCallback(async () => {
    initializationRef.current.attempted = false;
    initializationRef.current.promise = null;
    setError(null);
    setIsLoading(true);
    
    try {
      await initializeWorkflow();
    } catch (error: any) {
      console.error('Retry failed:', error);
      setError('Failed to initialize workflow after retry.');
    }
  }, [initializeWorkflow]);

  useEffect(() => {
    if (tenantId && !initializationRef.current.attempted) {
      initializationRef.current.attempted = true;
      
      if (!initializationRef.current.promise) {
        initializationRef.current.promise = initializeWorkflow();
      }
    }

    return () => {
      // Cleanup on unmount or dependency change
      if (initializationRef.current.promise) {
        initializationRef.current.attempted = false;
        initializationRef.current.promise = null;
      }
    };
  }, [tenantId, workflowId, initializeWorkflow]);

  return {
    workflow,
    isLoading,
    error,
    createWorkflow,
    retryInitialization
  };
};
