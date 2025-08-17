
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
  
  // Use refs to prevent multiple simultaneous initialization attempts
  const initializationRef = useRef<{
    attempted: boolean;
    inProgress: boolean;
    currentTenantId: string | null;
    currentWorkflowId: string | null;
  }>({
    attempted: false,
    inProgress: false,
    currentTenantId: null,
    currentWorkflowId: null
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

      // Check if workflow has steps - but don't recreate automatically to avoid infinite loops
      const { data: steps, error: stepsError } = await supabase
        .from('onboarding_steps')
        .select('id')
        .eq('workflow_id', workflowId);

      if (stepsError) {
        console.error('Error checking workflow steps:', stepsError);
      } else if (!steps || steps.length === 0) {
        console.log('Workflow has no steps - workflow may need recreation');
        // Don't automatically recreate here to prevent infinite loops
        // Let the component decide what to do
      }

      setWorkflow(data);
      return data;
    } catch (error: any) {
      console.error('Error loading workflow:', error);
      throw error;
    }
  }, []);

  const initializeWorkflow = useCallback(async (): Promise<void> => {
    // Prevent multiple simultaneous initialization attempts
    if (initializationRef.current.inProgress) {
      console.log('Initialization already in progress, skipping...');
      return;
    }

    // Check if we've already initialized for this tenant/workflow combination
    if (initializationRef.current.attempted && 
        initializationRef.current.currentTenantId === tenantId &&
        initializationRef.current.currentWorkflowId === workflowId) {
      console.log('Already attempted initialization for this configuration, skipping...');
      return;
    }

    if (!tenantId) {
      console.log('No tenant ID provided, skipping initialization');
      return;
    }

    try {
      initializationRef.current.inProgress = true;
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

      // Mark as successfully attempted
      initializationRef.current.attempted = true;
      initializationRef.current.currentTenantId = tenantId;
      initializationRef.current.currentWorkflowId = workflowId || null;

    } catch (error: any) {
      console.error('Workflow initialization failed:', error);
      setError(error.message || 'Failed to initialize workflow');
    } finally {
      initializationRef.current.inProgress = false;
      setIsLoading(false);
    }
  }, [tenantId, workflowId, autoCreate, loadWorkflow, createWorkflow]);

  const retryInitialization = useCallback(async () => {
    // Reset initialization state
    initializationRef.current = {
      attempted: false,
      inProgress: false,
      currentTenantId: null,
      currentWorkflowId: null
    };
    
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
    // Only initialize if we haven't attempted for this configuration
    if (tenantId && 
        (!initializationRef.current.attempted || 
         initializationRef.current.currentTenantId !== tenantId ||
         initializationRef.current.currentWorkflowId !== workflowId) &&
        !initializationRef.current.inProgress) {
      
      console.log('Starting workflow initialization for:', { tenantId, workflowId });
      initializeWorkflow();
    }

    return () => {
      // Cleanup function to cancel any in-progress operations
      if (initializationRef.current.inProgress) {
        console.log('Cleaning up workflow initialization');
        initializationRef.current.inProgress = false;
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
