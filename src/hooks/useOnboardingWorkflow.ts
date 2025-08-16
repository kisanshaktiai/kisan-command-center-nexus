
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';

export interface OnboardingWorkflow {
  id: string;
  tenant_id: string;
  current_step: number;
  total_steps: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  started_at: string | null;
  completed_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  tenants?: {
    name: string;
    status: string;
    type: string;
    subscription_plan: string;
  };
}

export interface OnboardingStep {
  id: string;
  workflow_id: string;
  step_number: number;
  step_name: string;
  step_status: 'not_started' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  step_data: Record<string, any>;
  validation_errors: any[];
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
  onboarding_step_templates?: {
    name: string;
    description: string;
    required: boolean;
    estimated_time_minutes: number;
    validation_rules: Record<string, any>;
  };
}

export interface OnboardingWorkflowWithSteps extends OnboardingWorkflow {
  onboarding_steps: OnboardingStep[];
}

export function useOnboardingWorkflow(tenantId: string) {
  const { showSuccess, showError } = useNotifications();
  const queryClient = useQueryClient();

  // Fetch workflow with steps
  const {
    data: workflow,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['onboarding-workflow', tenantId],
    queryFn: async (): Promise<OnboardingWorkflowWithSteps | null> => {
      if (!tenantId) return null;

      const { data, error } = await supabase.functions.invoke('get-onboarding-workflow', {
        body: { tenant_id: tenantId }
      });

      if (error) {
        console.error('Error fetching onboarding workflow:', error);
        throw new Error(error.message || 'Failed to fetch onboarding workflow');
      }

      return data;
    },
    enabled: !!tenantId,
    refetchOnWindowFocus: false,
    retry: 2
  });

  // Update step mutation
  const updateStepMutation = useMutation({
    mutationFn: async ({
      stepId,
      status,
      stepData = {},
      completedBy
    }: {
      stepId: string;
      status: OnboardingStep['step_status'];
      stepData?: Record<string, any>;
      completedBy?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('update-onboarding-step', {
        body: {
          step_id: stepId,
          status,
          step_data: stepData,
          completed_by: completedBy
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to update step');
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-workflow', tenantId] });
      const statusMessages = {
        completed: 'Step marked as completed',
        failed: 'Step marked as failed',
        in_progress: 'Step started',
        skipped: 'Step skipped'
      };
      showSuccess(statusMessages[variables.status] || 'Step updated successfully');
    },
    onError: (error: Error) => {
      showError('Failed to update step', {
        description: error.message
      });
    }
  });

  // Complete workflow mutation
  const completeWorkflowMutation = useMutation({
    mutationFn: async (workflowId: string) => {
      const { data, error } = await supabase.functions.invoke('complete-onboarding', {
        body: { workflow_id: workflowId }
      });

      if (error) {
        throw new Error(error.message || 'Failed to complete workflow');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-workflow', tenantId] });
      showSuccess('Onboarding workflow completed successfully!');
    },
    onError: (error: Error) => {
      showError('Failed to complete workflow', {
        description: error.message
      });
    }
  });

  // Bulk update steps mutation
  const bulkUpdateStepsMutation = useMutation({
    mutationFn: async ({
      stepIds,
      status,
      completedBy
    }: {
      stepIds: string[];
      status: OnboardingStep['step_status'];
      completedBy?: string;
    }) => {
      const promises = stepIds.map(stepId =>
        supabase.functions.invoke('update-onboarding-step', {
          body: {
            step_id: stepId,
            status,
            completed_by: completedBy
          }
        })
      );

      const results = await Promise.all(promises);
      const errors = results.filter(result => result.error);
      
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} steps`);
      }

      return results;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-workflow', tenantId] });
      showSuccess(`${variables.stepIds.length} steps updated successfully`);
    },
    onError: (error: Error) => {
      showError('Bulk update failed', {
        description: error.message
      });
    }
  });

  return {
    workflow,
    isLoading,
    error,
    refetch,
    updateStep: updateStepMutation.mutate,
    isUpdatingStep: updateStepMutation.isPending,
    completeWorkflow: completeWorkflowMutation.mutate,
    isCompletingWorkflow: completeWorkflowMutation.isPending,
    bulkUpdateSteps: bulkUpdateStepsMutation.mutate,
    isBulkUpdating: bulkUpdateStepsMutation.isPending
  };
}
