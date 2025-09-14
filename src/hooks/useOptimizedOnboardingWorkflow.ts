
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

// Atomic state management using useReducer pattern
type InitializationState = {
  status: 'idle' | 'initializing' | 'completed' | 'error';
  tenantId: string | null;
  workflowId: string | null;
  attemptCount: number;
  lastError: string | null;
};

export const useOptimizedOnboardingWorkflow = ({
  tenantId,
  workflowId,
  autoCreate = true
}: UseOptimizedOnboardingWorkflowOptions) => {
  const [workflow, setWorkflow] = useState<OnboardingWorkflow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useNotifications();
  
  // Atomic initialization state to prevent race conditions
  const initStateRef = useRef<InitializationState>({
    status: 'idle',
    tenantId: null,
    workflowId: null,
    attemptCount: 0,
    lastError: null
  });

  // Request tracking for deduplication
  const activeRequestRef = useRef<Promise<OnboardingWorkflow | null> | null>(null);

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

      // Check if workflow has steps - but don't auto-recreate to avoid infinite loops
      const { data: steps, error: stepsError } = await supabase
        .from('onboarding_steps')
        .select('id')
        .eq('workflow_id', workflowId);

      if (stepsError) {
        console.error('Error checking workflow steps:', stepsError);
      } else if (!steps || steps.length === 0) {
        console.warn('Workflow has no steps - this may require manual intervention');
        // Don't automatically recreate - let the UI handle this case
      }

      setWorkflow(data);
      return data;
    } catch (error: any) {
      console.error('Error loading workflow:', error);
      throw error;
    }
  }, []);

  // Atomic initialization with proper guards and cleanup
  const initializeWorkflow = useCallback(async (): Promise<void> => {
    const currentState = initStateRef.current;
    
    // Prevent multiple simultaneous initializations
    if (currentState.status === 'initializing') {
      console.log('Initialization already in progress, skipping...');
      return;
    }

    // Check if we've already initialized for this configuration
    if (currentState.status === 'completed' && 
        currentState.tenantId === tenantId &&
        currentState.workflowId === workflowId) {
      console.log('Already initialized for this configuration, skipping...');
      return;
    }

    if (!tenantId) {
      console.log('No tenant ID provided, skipping initialization');
      return;
    }

    // Prevent excessive retry attempts
    if (currentState.attemptCount >= 3) {
      console.log('Maximum initialization attempts reached');
      setError('Maximum initialization attempts reached. Please refresh the page.');
      return;
    }

    // Update atomic state
    initStateRef.current = {
      ...currentState,
      status: 'initializing',
      tenantId,
      workflowId: workflowId || null,
      attemptCount: currentState.attemptCount + 1
    };

    try {
      setIsLoading(true);
      setError(null);

      // Request deduplication - reuse active request if it exists
      if (activeRequestRef.current) {
        console.log('Reusing active request...');
        await activeRequestRef.current;
        return;
      }

      // Create new request and store it for deduplication
      let requestPromise: Promise<OnboardingWorkflow | null>;

      if (workflowId) {
        requestPromise = loadWorkflow(workflowId);
      } else if (autoCreate) {
        requestPromise = createWorkflow();
      } else {
        setWorkflow(null);
        initStateRef.current.status = 'completed';
        return;
      }

      activeRequestRef.current = requestPromise;
      await requestPromise;

      // Mark as successfully completed
      initStateRef.current = {
        ...initStateRef.current,
        status: 'completed',
        lastError: null
      };

    } catch (error: any) {
      console.error('Workflow initialization failed:', error);
      initStateRef.current = {
        ...initStateRef.current,
        status: 'error',
        lastError: error.message || 'Failed to initialize workflow'
      };
      setError(error.message || 'Failed to initialize workflow');
    } finally {
      activeRequestRef.current = null;
      setIsLoading(false);
    }
  }, [tenantId, workflowId, autoCreate, loadWorkflow, createWorkflow]);

  const retryInitialization = useCallback(async () => {
    // Reset initialization state for retry
    initStateRef.current = {
      status: 'idle',
      tenantId: null,
      workflowId: null,
      attemptCount: 0,
      lastError: null
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

  // Single effect with proper dependency management
  useEffect(() => {
    const currentState = initStateRef.current;
    
    // Only initialize if configuration has changed or we haven't initialized yet
    if (tenantId && 
        (currentState.status === 'idle' || 
         currentState.tenantId !== tenantId ||
         currentState.workflowId !== workflowId)) {
      
      console.log('Starting workflow initialization for:', { tenantId, workflowId });
      initializeWorkflow();
    }

    // Cleanup function
    return () => {
      if (activeRequestRef.current) {
        console.log('Cleaning up active request');
        activeRequestRef.current = null;
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
