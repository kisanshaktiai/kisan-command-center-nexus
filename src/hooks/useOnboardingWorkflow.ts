
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';

interface OnboardingWorkflow {
  id: string;
  tenant_id: string;
  status: string;
  current_step: number;
  total_steps: number;
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useNotifications();
  const initializationAttempted = useRef(false);
  const retryCount = useRef(0);
  const maxRetries = 3;

  const createWorkflow = async () => {
    try {
      console.log('Creating workflow for tenant:', tenantId);
      
      const { data, error } = await supabase.functions.invoke('start-onboarding-workflow', {
        body: { tenantId, forceNew: false }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
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
        console.log('Workflow created successfully:', newWorkflow);
        
        setWorkflow(newWorkflow);
        showSuccess(`Onboarding workflow initialized with ${data.steps_created} steps`);
        return newWorkflow;
      } else {
        console.error('Edge function returned unsuccessful response:', data);
        const errorMessage = data?.error || 'Failed to create workflow';
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('Error creating workflow:', error);
      setError(error.message || 'Failed to initialize workflow');
      throw error;
    }
  };

  const loadWorkflow = async (workflowId: string) => {
    try {
      console.log('Loading workflow:', workflowId);
      
      const { data, error } = await supabase
        .from('onboarding_workflows')
        .select('id, tenant_id, status, current_step, total_steps')
        .eq('id', workflowId)
        .single();

      if (error) {
        console.error('Error loading workflow:', error);
        throw error;
      }

      console.log('Workflow loaded successfully:', data);
      
      // Verify workflow has steps
      const { data: steps, error: stepsError } = await supabase
        .from('onboarding_steps')
        .select('id')
        .eq('workflow_id', workflowId);

      if (stepsError) {
        console.error('Error checking workflow steps:', stepsError);
      } else if (!steps || steps.length === 0) {
        console.log('Workflow has no steps, will attempt to recreate');
        return await createWorkflow();
      } else {
        console.log('Workflow has', steps.length, 'steps');
      }

      setWorkflow(data);
      return data;
    } catch (error: any) {
      console.error('Error loading workflow:', error);
      throw error;
    }
  };

  const initializeWorkflow = async () => {
    if (initializationAttempted.current || !tenantId) {
      return;
    }

    initializationAttempted.current = true;

    try {
      setIsLoading(true);
      setError(null);
      retryCount.current = 0;

      console.log('Initializing workflow for tenant:', tenantId, 'with workflowId:', workflowId);

      // Add a small delay to prevent race conditions
      await new Promise(resolve => setTimeout(resolve, 100));

      if (workflowId) {
        await loadWorkflow(workflowId);
      } else if (autoCreate) {
        await createWorkflow();
      } else {
        console.log('No workflow to load or create');
        setWorkflow(null);
      }
    } catch (error: any) {
      console.error('Workflow initialization failed:', error);
      setError(error.message || 'Failed to initialize workflow');
    } finally {
      setIsLoading(false);
    }
  };

  const retryInitialization = async () => {
    if (retryCount.current >= maxRetries) {
      setError('Maximum retry attempts reached. Please try again later.');
      return;
    }

    console.log('Retrying initialization, attempt:', retryCount.current + 1);
    retryCount.current++;
    initializationAttempted.current = false;
    setError(null);
    
    try {
      await initializeWorkflow();
    } catch (error: any) {
      console.error(`Retry ${retryCount.current} failed:`, error);
      if (retryCount.current >= maxRetries) {
        setError('Failed to initialize workflow after multiple attempts.');
      }
    }
  };

  useEffect(() => {
    if (tenantId && !initializationAttempted.current) {
      console.log('Effect triggered - initializing workflow');
      initializeWorkflow();
    }
  }, [tenantId, workflowId]);

  // Reset when tenantId or workflowId changes
  useEffect(() => {
    console.log('Dependencies changed - resetting state');
    initializationAttempted.current = false;
    retryCount.current = 0;
    setWorkflow(null);
    setError(null);
    setIsLoading(true);
  }, [tenantId, workflowId]);

  return {
    workflow,
    isLoading,
    error,
    createWorkflow,
    retryInitialization
  };
};
