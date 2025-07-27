
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OnboardingWorkflow {
  id: string;
  tenant_id: string;
  current_step: number;
  total_steps: number;
  status: string;
  started_at: string;
  completed_at: string | null;
  metadata: Record<string, any>;
  tenants?: {
    name: string;
    status: string;
    subscription_plan: string;
  };
}

interface OnboardingStep {
  id: string;
  workflow_id: string;
  step_number: number;
  step_name: string;
  step_status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  step_data: Record<string, any>;
  validation_errors: any[];
  completed_at: string | null;
  estimated_time?: number;
  actual_time?: number;
}

interface RealtimeOnboardingData {
  workflows: OnboardingWorkflow[];
  steps: Record<string, OnboardingStep[]>;
  notifications: any[];
  analytics: {
    totalWorkflows: number;
    activeWorkflows: number;
    completedWorkflows: number;
    averageCompletionTime: number;
    successRate: number;
  };
}

export const useRealtimeOnboarding = () => {
  const [data, setData] = useState<RealtimeOnboardingData>({
    workflows: [],
    steps: {},
    notifications: [],
    analytics: {
      totalWorkflows: 0,
      activeWorkflows: 0,
      completedWorkflows: 0,
      averageCompletionTime: 0,
      successRate: 0
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch workflows
        const { data: workflowsData, error: workflowsError } = await supabase
          .from('onboarding_workflows')
          .select(`
            *,
            tenants(name, status, subscription_plan)
          `)
          .order('created_at', { ascending: false });

        if (workflowsError) throw workflowsError;

        // Fetch steps for each workflow
        const stepsData: Record<string, OnboardingStep[]> = {};
        
        for (const workflow of workflowsData || []) {
          const { data: steps, error: stepsError } = await supabase
            .from('onboarding_steps')
            .select('*')
            .eq('workflow_id', workflow.id)
            .order('step_number');

          if (stepsError) throw stepsError;

          stepsData[workflow.id] = steps?.map(step => ({
            ...step,
            validation_errors: Array.isArray(step.validation_errors) ? 
              step.validation_errors : 
              typeof step.validation_errors === 'string' ? 
                JSON.parse(step.validation_errors) : []
          })) || [];
        }

        // Calculate analytics
        const analytics = calculateAnalytics(workflowsData || []);

        setData({
          workflows: workflowsData || [],
          steps: stepsData,
          notifications: [],
          analytics
        });

      } catch (error) {
        console.error('Error fetching onboarding data:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
        toast.error('Failed to load onboarding data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();

    // Set up real-time subscriptions
    const workflowsChannel = supabase
      .channel('onboarding-workflows-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'onboarding_workflows'
      }, (payload) => {
        console.log('Workflow change:', payload);
        
        setData(prev => {
          if (payload.eventType === 'INSERT') {
            toast.success(`New onboarding workflow started for ${payload.new.tenant_id}`);
            return {
              ...prev,
              workflows: [payload.new, ...prev.workflows],
              analytics: calculateAnalytics([payload.new, ...prev.workflows])
            };
          } else if (payload.eventType === 'UPDATE') {
            const updatedWorkflows = prev.workflows.map(w => 
              w.id === payload.new.id ? { ...w, ...payload.new } : w
            );
            
            if (payload.new.status === 'completed') {
              toast.success(`Onboarding completed for tenant!`);
            }
            
            return {
              ...prev,
              workflows: updatedWorkflows,
              analytics: calculateAnalytics(updatedWorkflows)
            };
          } else if (payload.eventType === 'DELETE') {
            const filteredWorkflows = prev.workflows.filter(w => w.id !== payload.old.id);
            return {
              ...prev,
              workflows: filteredWorkflows,
              analytics: calculateAnalytics(filteredWorkflows)
            };
          }
          return prev;
        });
      })
      .subscribe();

    const stepsChannel = supabase
      .channel('onboarding-steps-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'onboarding_steps'
      }, (payload) => {
        console.log('Step change:', payload);
        
        setData(prev => {
          const workflowId = payload.new?.workflow_id || payload.old?.workflow_id;
          
          if (payload.eventType === 'INSERT') {
            return {
              ...prev,
              steps: {
                ...prev.steps,
                [workflowId]: [...(prev.steps[workflowId] || []), payload.new]
              }
            };
          } else if (payload.eventType === 'UPDATE') {
            const updatedSteps = (prev.steps[workflowId] || []).map(step =>
              step.id === payload.new.id ? { ...step, ...payload.new } : step
            );
            
            if (payload.new.step_status === 'completed') {
              toast.success(`Step "${payload.new.step_name}" completed!`);
            } else if (payload.new.step_status === 'failed') {
              toast.error(`Step "${payload.new.step_name}" failed`);
            }
            
            return {
              ...prev,
              steps: {
                ...prev.steps,
                [workflowId]: updatedSteps
              }
            };
          } else if (payload.eventType === 'DELETE') {
            const filteredSteps = (prev.steps[workflowId] || []).filter(step => 
              step.id !== payload.old.id
            );
            return {
              ...prev,
              steps: {
                ...prev.steps,
                [workflowId]: filteredSteps
              }
            };
          }
          return prev;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(workflowsChannel);
      supabase.removeChannel(stepsChannel);
    };
  }, []);

  const calculateAnalytics = (workflows: OnboardingWorkflow[]) => {
    const total = workflows.length;
    const active = workflows.filter(w => w.status === 'in_progress').length;
    const completed = workflows.filter(w => w.status === 'completed').length;
    
    const completedWorkflows = workflows.filter(w => w.status === 'completed' && w.completed_at && w.started_at);
    const avgTime = completedWorkflows.length > 0 ? 
      completedWorkflows.reduce((sum, w) => {
        const start = new Date(w.started_at).getTime();
        const end = new Date(w.completed_at!).getTime();
        return sum + (end - start);
      }, 0) / completedWorkflows.length / (1000 * 60 * 60) : 0; // Convert to hours
    
    const successRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      totalWorkflows: total,
      activeWorkflows: active,
      completedWorkflows: completed,
      averageCompletionTime: avgTime,
      successRate
    };
  };

  return {
    data,
    isLoading,
    error,
    refetch: () => window.location.reload() // Simple refetch for now
  };
};
