
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { onboardingService, OnboardingWorkflow, OnboardingStep } from '@/services/onboardingService';

interface UseTenantOnboardingWorkflowOptions {
  tenantId: string;
  workflowId?: string;
  autoCreate?: boolean;
}

// Global state to prevent multiple simultaneous initializations
const globalInitState = new Map<string, {
  status: 'idle' | 'initializing' | 'completed' | 'error';
  promise?: Promise<any>;
  timestamp: number;
}>();

export const useTenantOnboardingWorkflow = ({
  tenantId,
  workflowId,
  autoCreate = true
}: UseTenantOnboardingWorkflowOptions) => {
  const [workflow, setWorkflow] = useState<OnboardingWorkflow | null>(null);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const { showSuccess, showError } = useNotifications();

  // Create a unique key for this configuration
  const configKey = `${tenantId}:${workflowId || 'auto'}`;
  const initTimeoutRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);

  const clearInitTimeout = useCallback(() => {
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = undefined;
    }
  }, []);

  const safeSetState = useCallback((updater: () => void) => {
    if (mountedRef.current) {
      updater();
    }
  }, []);

  const initializeWorkflow = useCallback(async (): Promise<void> => {
    if (!tenantId) {
      safeSetState(() => setError('Tenant ID is required'));
      return;
    }

    const globalState = globalInitState.get(configKey);
    const now = Date.now();

    // Check if we're already initializing or have recent results
    if (globalState) {
      if (globalState.status === 'initializing' && globalState.promise) {
        console.log('⏳ Reusing existing initialization promise');
        try {
          await globalState.promise;
          return;
        } catch (err) {
          // Continue with new initialization if promise failed
        }
      }
      
      if (globalState.status === 'completed' && (now - globalState.timestamp) < 30000) {
        console.log('✅ Using cached initialization results');
        return;
      }
    }

    // Set initializing state
    globalInitState.set(configKey, {
      status: 'initializing',
      timestamp: now
    });

    safeSetState(() => {
      setIsLoading(true);
      setError(null);
    });

    try {
      let workflowResult: OnboardingWorkflow | null = null;

      if (workflowId) {
        console.log('📂 Loading existing workflow:', workflowId);
        workflowResult = await onboardingService.loadWorkflow(workflowId);
      } else if (autoCreate) {
        console.log('🚀 Creating new workflow for tenant:', tenantId);
        workflowResult = await onboardingService.createWorkflow(tenantId);
      }

      if (workflowResult) {
        console.log('✅ Workflow loaded/created:', workflowResult.id);
        safeSetState(() => setWorkflow(workflowResult));
        
        // Load steps for the workflow
        const stepsResult = await onboardingService.loadSteps(workflowResult.id);
        console.log('📋 Steps loaded:', stepsResult.length);
        safeSetState(() => setSteps(stepsResult));
        
        if (stepsResult.length > 0) {
          showSuccess(`Workflow initialized with ${stepsResult.length} steps`);
        }

        // Mark as successfully completed
        globalInitState.set(configKey, {
          status: 'completed',
          timestamp: now
        });
      } else {
        throw new Error('No workflow was created or loaded');
      }

    } catch (error: any) {
      console.error('❌ Workflow initialization failed:', error);
      
      globalInitState.set(configKey, {
        status: 'error',
        timestamp: now
      });
      
      const errorMessage = error.message || 'Failed to initialize workflow';
      safeSetState(() => setError(errorMessage));
      showError('Failed to initialize onboarding workflow: ' + errorMessage);
    } finally {
      safeSetState(() => setIsLoading(false));
    }
  }, [tenantId, workflowId, autoCreate, showSuccess, showError, configKey, safeSetState]);

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
      safeSetState(() => {
        setSteps(currentSteps => 
          currentSteps.map(step => 
            step.step_number === stepNumber 
              ? { ...step, step_status: status, step_data: { ...step.step_data, ...stepData } }
              : step
          )
        );
      });

      showSuccess(`Step ${stepNumber} ${status === 'completed' ? 'completed' : 'updated'}`);
    } catch (error: any) {
      console.error('Error updating step status:', error);
      showError('Failed to update step status');
      throw error;
    }
  }, [workflow?.id, steps, showSuccess, showError, safeSetState]);

  const removeWorkflow = useCallback(async (): Promise<void> => {
    if (!workflow?.id) {
      throw new Error('No workflow available to remove');
    }

    try {
      safeSetState(() => setIsRemoving(true));
      await onboardingService.removeWorkflow(workflow.id);
      
      // Clear local state
      safeSetState(() => {
        setWorkflow(null);
        setSteps([]);
      });
      
      // Clear global state
      globalInitState.delete(configKey);
      
      showSuccess('Workflow removed successfully');
    } catch (error: any) {
      console.error('Error removing workflow:', error);
      showError('Failed to remove workflow: ' + (error.message || 'Unknown error'));
      throw error;
    } finally {
      safeSetState(() => setIsRemoving(false));
    }
  }, [workflow?.id, showSuccess, showError, configKey, safeSetState]);

  const retryInitialization = useCallback(() => {
    console.log('🔄 Retrying initialization...');
    
    // Clear global state
    globalInitState.delete(configKey);
    
    safeSetState(() => {
      setError(null);
      setWorkflow(null);
      setSteps([]);
      setIsLoading(true);
    });
    
    // Debounced retry
    clearInitTimeout();
    initTimeoutRef.current = setTimeout(() => {
      initializeWorkflow();
    }, 500);
  }, [configKey, initializeWorkflow, clearInitTimeout, safeSetState]);

  // Single effect with proper cleanup
  useEffect(() => {
    mountedRef.current = true;
    
    if (tenantId) {
      console.log('🎯 Starting workflow initialization for:', { tenantId, workflowId });
      
      // Debounced initialization to prevent rapid calls
      clearInitTimeout();
      initTimeoutRef.current = setTimeout(() => {
        initializeWorkflow();
      }, 100);
    }

    return () => {
      mountedRef.current = false;
      clearInitTimeout();
    };
  }, [tenantId, workflowId]); // Stable dependencies only

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      clearInitTimeout();
    };
  }, [clearInitTimeout]);

  return {
    workflow,
    steps,
    isLoading,
    error,
    isRemoving,
    updateStepStatus,
    removeWorkflow,
    retryInitialization,
    normalizeStepName: onboardingService.normalizeStepName
  };
};
