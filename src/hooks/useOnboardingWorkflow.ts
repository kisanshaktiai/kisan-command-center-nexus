
import { useState, useEffect } from 'react';
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

  const createWorkflow = async () => {
    try {
      console.log('Creating workflow for tenant:', tenantId);
      
      const { data, error } = await supabase.functions.invoke('start-onboarding-workflow', {
        body: { tenantId, forceNew: false }
      });

      if (error) throw error;

      if (data?.success) {
        const newWorkflow = {
          id: data.workflow_id,
          tenant_id: tenantId,
          status: data.status,
          current_step: data.current_step,
          total_steps: data.total_steps
        };
        setWorkflow(newWorkflow);
        showSuccess('Onboarding workflow initialized');
        return newWorkflow;
      } else {
        throw new Error(data?.error || 'Failed to create workflow');
      }
    } catch (error: any) {
      console.error('Error creating workflow:', error);
      setError(error.message);
      showError('Failed to initialize workflow');
      throw error;
    }
  };

  const loadWorkflow = async (workflowId: string) => {
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
      setError(error.message);
      throw error;
    }
  };

  const initializeWorkflow = async () => {
    if (!tenantId) {
      setError('Tenant ID is required');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (workflowId) {
        // Load existing workflow
        await loadWorkflow(workflowId);
      } else if (autoCreate) {
        // Create new workflow
        await createWorkflow();
      } else {
        // No workflow ID and auto-create disabled
        setWorkflow(null);
      }
    } catch (error: any) {
      console.error('Workflow initialization failed:', error);
      // Don't throw here, let component handle the error state
    } finally {
      setIsLoading(false);
    }
  };

  const retryInitialization = () => {
    initializeWorkflow();
  };

  useEffect(() => {
    initializeWorkflow();
  }, [tenantId, workflowId]);

  return {
    workflow,
    isLoading,
    error,
    createWorkflow,
    retryInitialization
  };
};
