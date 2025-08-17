
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { onboardingService, OnboardingWorkflow, OnboardingStep } from '@/services/onboardingService';

interface UseTenantOnboardingWorkflowOptions {
  tenantId: string;
  workflowId?: string;
  autoCreate?: boolean;
}

interface InitializationState {
  status: 'idle' | 'initializing' | 'completed' | 'error';
  tenantId: string | null;
  workflowId: string | null;
  attemptCount: number;
}

export const useTenantOnboardingWorkflow = ({
  tenantId,
  workflowId,
  autoCreate = true
}: UseTenantOnboardingWorkflowOptions) => {
  const [workflow, setWorkflow] = useState<OnboardingWorkflow | null>(null);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useNotifications();

  // Atomic state management to prevent race conditions
  const initStateRef = useRef<InitializationState>({
    status: 'idle',
    tenantId: null,
    workflowId: null,
    attemptCount: 0
  });

  const activeRequestRef = useRef<Promise<any> | null>(null);

  const initializeWorkflow = useCallback(async (): Promise<void> => {
    const currentState = initStateRef.current;
    
    // Prevent multiple simultaneous initializations
    if (currentState.status === 'initializing') {
      console.log('Initialization already in progress, skipping...');
      return;
    }

    // Check if already initialized for this configuration
    if (currentState.status === 'completed' && 
        currentState.tenantId === tenantId &&
        currentState.workflowId === workflowId) {
      console.log('Already initialized for this configuration');
      return;
    }

    if (!tenantId) {
      console.log('No tenant ID provided');
      setError('Tenant ID is required');
      return;
    }

    // Reset attempt count for new tenant/workflow combinations
    if (currentState.tenantId !== tenantId || currentState.workflowId !== workflowId) {
      initStateRef.current = {
        ...currentState,
        attemptCount: 0
      };
    }

    // Prevent excessive retry attempts
    if (initStateRef.current.attemptCount >= 3) {
      setError('Maximum initialization attempts reached. Please try refreshing the page.');
      return;
    }

    // Update atomic state
    initStateRef.current = {
      ...initStateRef.current,
      status: 'initializing',
      tenantId,
      workflowId: workflowId || null,
      attemptCount: initStateRef.current.attemptCount + 1
    };

    try {
      setIsLoading(true);
      setError(null);

      // Request deduplication
      if (activeRequestRef.current) {
        console.log('Reusing active request...');
        await activeRequestRef.current;
        return;
      }

      let workflowResult: OnboardingWorkflow | null = null;

      if (workflowId) {
        console.log('Loading existing workflow:', workflowId);
        const loadRequest = onboardingService.loadWorkflow(workflowId);
        activeRequestRef.current = loadRequest;
        workflowResult = await loadRequest;
      } else if (autoCreate) {
        console.log('Creating new workflow for tenant:', tenantId);
        const createRequest = onboardingService.createWorkflow(tenantId);
        activeRequestRef.current = createRequest;
        workflowResult = await createRequest;
      }

      if (workflowResult) {
        console.log('Workflow loaded/created:', workflowResult.id);
        setWorkflow(workflowResult);
        
        // Load steps for the workflow
        const stepsResult = await onboardingService.loadSteps(workflowResult.id);
        console.log('Steps loaded:', stepsResult.length);
        setSteps(stepsResult);
        
        if (stepsResult.length > 0) {
          showSuccess(`Workflow initialized with ${stepsResult.length} steps`);
        }

        // Mark as successfully completed
        initStateRef.current = {
          ...initStateRef.current,
          status: 'completed'
        };
      } else {
        throw new Error('No workflow was created or loaded');
      }

    } catch (error: any) {
      console.error('Workflow initialization failed:', error);
      
      // Don't increment attempt count for certain types of errors
      const shouldRetry = !error.message?.includes('Tenant not found') && 
                         !error.message?.includes('function get_onboarding_template');
      
      if (!shouldRetry) {
        initStateRef.current = {
          ...initStateRef.current,
          status: 'error',
          attemptCount: 3 // Set to max to prevent further retries
        };
      } else {
        initStateRef.current = {
          ...initStateRef.current,
          status: 'error'
        };
      }
      
      const errorMessage = error.message || 'Failed to initialize workflow';
      setError(errorMessage);
      showError('Failed to initialize onboarding workflow: ' + errorMessage);
    } finally {
      activeRequestRef.current = null;
      setIsLoading(false);
    }
  }, [tenantId, workflowId, autoCreate, showSuccess, showError]);

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

      await onboardingService.updateStepStatus(stepToUpdate.id, status, stepData);

      // Update local state
      setSteps(currentSteps => 
        currentSteps.map(step => 
          step.step_number === stepNumber 
            ? { ...step, step_status: status, step_data: { ...step.step_data, ...stepData } }
            : step
        )
      );

      showSuccess(`Step ${stepNumber} ${status === 'completed' ? 'completed' : 'updated'}`);
    } catch (error: any) {
      console.error('Error updating step status:', error);
      showError('Failed to update step status');
      throw error;
    }
  }, [workflow?.id, steps, showSuccess, showError]);

  const retryInitialization = useCallback(async () => {
    console.log('Retrying initialization...');
    
    // Reset the initialization state completely
    initStateRef.current = {
      status: 'idle',
      tenantId: null,
      workflowId: null,
      attemptCount: 0
    };
    
    setError(null);
    setWorkflow(null);
    setSteps([]);
    setIsLoading(true);
    
    // Small delay to ensure state is reset
    setTimeout(() => {
      initializeWorkflow();
    }, 100);
  }, [initializeWorkflow]);

  // Single effect with proper dependency management
  useEffect(() => {
    const currentState = initStateRef.current;
    
    if (tenantId && 
        (currentState.status === 'idle' || 
         currentState.tenantId !== tenantId ||
         currentState.workflowId !== workflowId)) {
      
      console.log('Starting workflow initialization for:', { tenantId, workflowId });
      initializeWorkflow();
    }

    return () => {
      if (activeRequestRef.current) {
        console.log('Cleaning up active request');
        activeRequestRef.current = null;
      }
    };
  }, [tenantId, workflowId, initializeWorkflow]);

  return {
    workflow,
    steps,
    isLoading,
    error,
    updateStepStatus,
    retryInitialization,
    normalizeStepName: onboardingService.normalizeStepName
  };
};
