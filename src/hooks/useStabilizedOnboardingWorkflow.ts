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

// Stable step name mapping - moved outside component to prevent recreation
const STEP_NAME_MAPPING: Record<string, string> = {
  'Company Profile': 'company-profile',
  'Branding & Design': 'branding-design', 
  'Enhanced Branding': 'branding-design',
  'Team & Permissions': 'team-permissions',
  'Enhanced Users & Roles': 'team-permissions',
  'Billing & Plan': 'billing-plan',
  'Domain & White-label': 'domain-whitelabel',
  'Domain & Branding': 'domain-whitelabel',
  'Review & Launch': 'review-launch',
  'Review & Go Live': 'review-launch'
};

const normalizeStepName = (stepName: string): string => {
  return STEP_NAME_MAPPING[stepName] || stepName.toLowerCase().replace(/\s+/g, '-');
};

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

  // Atomic state management using refs to prevent race conditions
  const initStateRef = useRef({
    isInitialized: false,
    isInitializing: false,
    lastTenantId: '',
    lastWorkflowId: '',
    attemptCount: 0
  });

  const activeRequestRef = useRef<Promise<any> | null>(null);

  // Stable workflow creation function
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

  // Stable workflow loading function
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

      setWorkflow(data);
      return data;
    } catch (error: any) {
      console.error('Error loading workflow:', error);
      throw error;
    }
  }, []);

  // Stable steps loading function with proper error handling
  const loadSteps = useCallback(async (workflowId: string): Promise<OnboardingStep[]> => {
    try {
      console.log('Loading steps for workflow:', workflowId);
      
      const { data, error } = await supabase
        .from('onboarding_steps')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('step_number');

      if (error) {
        console.error('Error loading steps:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn('No steps found for workflow:', workflowId);
        return [];
      }

      console.log('Loaded steps:', data.length);
      setSteps(data);
      return data;
    } catch (error: any) {
      console.error('Error loading steps:', error);
      throw error;
    }
  }, []);

  // Atomic initialization with proper guards
  const initialize = useCallback(async () => {
    const currentState = initStateRef.current;
    
    // Prevent multiple simultaneous initializations
    if (currentState.isInitializing) {
      console.log('Initialization already in progress, skipping...');
      return;
    }

    // Check if already initialized for this configuration
    if (currentState.isInitialized && 
        currentState.lastTenantId === tenantId &&
        currentState.lastWorkflowId === (workflowId || '')) {
      console.log('Already initialized for this configuration');
      return;
    }

    if (!tenantId) {
      console.log('No tenant ID provided');
      return;
    }

    // Prevent excessive retries
    if (currentState.attemptCount >= 3) {
      setError('Maximum initialization attempts reached');
      return;
    }

    // Update atomic state
    initStateRef.current = {
      ...currentState,
      isInitializing: true,
      attemptCount: currentState.attemptCount + 1
    };

    try {
      setIsLoading(true);
      setError(null);

      // Reuse active request if it exists
      if (activeRequestRef.current) {
        console.log('Reusing active request...');
        await activeRequestRef.current;
        return;
      }

      let workflowResult: OnboardingWorkflow | null = null;

      if (workflowId) {
        const loadRequest = loadWorkflow(workflowId);
        activeRequestRef.current = loadRequest;
        workflowResult = await loadRequest;
      } else if (autoCreate) {
        const createRequest = createWorkflow();
        activeRequestRef.current = createRequest;
        workflowResult = await createRequest;
      }

      if (workflowResult) {
        // Load steps for the workflow
        await loadSteps(workflowResult.id);
      }

      // Mark as successfully initialized
      initStateRef.current = {
        isInitialized: true,
        isInitializing: false,
        lastTenantId: tenantId,
        lastWorkflowId: workflowId || '',
        attemptCount: 0
      };

    } catch (error: any) {
      console.error('Initialization failed:', error);
      initStateRef.current = {
        ...initStateRef.current,
        isInitializing: false
      };
      setError(error.message || 'Failed to initialize workflow');
    } finally {
      activeRequestRef.current = null;
      setIsLoading(false);
    }
  }, [tenantId, workflowId, autoCreate, loadWorkflow, createWorkflow, loadSteps]);

  // Stable retry function
  const retryInitialization = useCallback(async () => {
    initStateRef.current = {
      isInitialized: false,
      isInitializing: false,
      lastTenantId: '',
      lastWorkflowId: '',
      attemptCount: 0
    };
    
    setError(null);
    setIsLoading(true);
    
    await initialize();
  }, [initialize]);

  // Single effect with proper dependency management
  useEffect(() => {
    const currentState = initStateRef.current;
    
    if (tenantId && 
        (!currentState.isInitialized || 
         currentState.lastTenantId !== tenantId ||
         currentState.lastWorkflowId !== (workflowId || ''))) {
      
      console.log('Starting initialization for:', { tenantId, workflowId });
      initialize();
    }

    // Cleanup function
    return () => {
      if (activeRequestRef.current) {
        console.log('Cleaning up active request');
        activeRequestRef.current = null;
      }
    };
  }, [tenantId, workflowId, initialize]);

  // Stable step update function with proper error handling
  const updateStepStatus = useCallback(async (
    stepNumber: number,
    status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed',
    stepData: any = {}
  ) => {
    if (!workflow?.id) {
      throw new Error('No workflow available');
    }

    try {
      // Find the step to update
      const stepToUpdate = steps.find(s => s.step_number === stepNumber);
      if (!stepToUpdate) {
        throw new Error(`Step ${stepNumber} not found`);
      }

      // Use Edge Function for consistent API pattern
      const { data, error } = await supabase.functions.invoke('fix-advance-step', {
        body: {
          stepId: stepToUpdate.id,
          newStatus: status,
          stepData
        }
      });

      if (error) {
        throw new Error(`Edge function error: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to update step');
      }

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
