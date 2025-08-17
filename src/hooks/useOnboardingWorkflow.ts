
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
      console.log('Creating database template-based workflow for tenant:', tenantId);
      
      const { data, error } = await supabase.functions.invoke('start-onboarding-workflow', {
        body: { tenantId, forceNew: false }
      });

      console.log('Template-based edge function response:', { data, error });

      if (error) {
        console.error('Template-based edge function error:', error);
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
        console.log('Database template-based workflow created successfully:', newWorkflow);
        console.log('Steps created:', data.steps_created);
        
        setWorkflow(newWorkflow);
        showSuccess(`Onboarding workflow initialized with ${data.steps_created} steps from database templates`);
        return newWorkflow;
      } else {
        console.error('Template-based edge function returned unsuccessful response:', data);
        const errorMessage = data?.error || 'Failed to create workflow from database templates';
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('Error creating database template-based workflow:', error);
      let userFriendlyError = 'Failed to initialize template-based workflow';
      
      if (error.message?.includes('step templates')) {
        userFriendlyError = 'No onboarding templates found in database. Please contact support.';
      } else if (error.message?.includes('Tenant not found')) {
        userFriendlyError = 'Tenant not found. Please check tenant configuration.';
      } else if (error.message?.includes('database')) {
        userFriendlyError = 'Database error occurred. Please try again or contact support.';
      } else if (error.message?.includes('Failed to create onboarding steps')) {
        userFriendlyError = 'Failed to create onboarding steps from templates. Please try again.';
      }
      
      setError(userFriendlyError);
      showError(userFriendlyError);
      throw error;
    }
  };

  const loadWorkflow = async (workflowId: string) => {
    try {
      console.log('Loading template-based workflow:', workflowId);
      
      const { data, error } = await supabase
        .from('onboarding_workflows')
        .select('id, tenant_id, status, current_step, total_steps')
        .eq('id', workflowId)
        .single();

      if (error) {
        console.error('Error loading template-based workflow:', error);
        throw error;
      }

      console.log('Template-based workflow loaded successfully:', data);
      
      // Verify workflow has steps
      const { data: steps, error: stepsError } = await supabase
        .from('onboarding_steps')
        .select('id')
        .eq('workflow_id', workflowId);

      if (stepsError) {
        console.error('Error checking workflow steps:', stepsError);
      } else if (!steps || steps.length === 0) {
        console.log('Workflow has no steps, will attempt to recreate');
        // Try to recreate workflow with steps
        return await createWorkflow();
      } else {
        console.log('Workflow has', steps.length, 'steps');
      }

      setWorkflow(data);
      return data;
    } catch (error: any) {
      console.error('Error loading template-based workflow:', error);
      setError(error.message);
      throw error;
    }
  };

  const initializeWorkflow = async () => {
    if (initializationAttempted.current || !tenantId) {
      console.log('Template-based initialization skipped - already attempted or no tenantId');
      return;
    }

    initializationAttempted.current = true;

    try {
      setIsLoading(true);
      setError(null);
      retryCount.current = 0;

      console.log('Initializing database template-based workflow for tenant:', tenantId, 'with workflowId:', workflowId);

      if (workflowId) {
        // Load existing workflow
        await loadWorkflow(workflowId);
      } else if (autoCreate) {
        // Create new workflow from database templates
        await createWorkflow();
      } else {
        // No workflow ID and auto-create disabled
        console.log('No template-based workflow to load or create');
        setWorkflow(null);
      }
    } catch (error: any) {
      console.error('Database template-based workflow initialization failed:', error);
      // Don't throw here, let component handle the error state
    } finally {
      setIsLoading(false);
    }
  };

  const retryInitialization = async () => {
    if (retryCount.current >= maxRetries) {
      setError('Maximum retry attempts reached. Please check if onboarding templates exist in the database and try again.');
      return;
    }

    console.log('Retrying database template-based initialization, attempt:', retryCount.current + 1);
    retryCount.current++;
    initializationAttempted.current = false;
    setError(null);
    
    try {
      await initializeWorkflow();
    } catch (error: any) {
      console.error(`Template-based retry ${retryCount.current} failed:`, error);
      if (retryCount.current >= maxRetries) {
        setError('Failed to initialize template-based workflow after multiple attempts. Please ensure onboarding templates exist in the database.');
      }
    }
  };

  useEffect(() => {
    if (tenantId && !initializationAttempted.current) {
      console.log('Effect triggered - initializing database template-based workflow');
      initializeWorkflow();
    }
  }, [tenantId, workflowId]);

  // Reset when tenantId or workflowId changes
  useEffect(() => {
    console.log('Template-based onboarding dependencies changed - resetting state');
    initializationAttempted.current = false;
    retryCount.current = 0;
    setWorkflow(null);
    setError(null);
  }, [tenantId, workflowId]);

  return {
    workflow,
    isLoading,
    error,
    createWorkflow,
    retryInitialization
  };
};
