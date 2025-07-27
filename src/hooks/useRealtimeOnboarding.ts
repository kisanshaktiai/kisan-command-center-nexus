
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type OnboardingStepStatus = Database['public']['Enums']['onboarding_step_status'];

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
  step_status: OnboardingStepStatus;
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

// Helper function to safely parse JSON
const safeJsonParse = (jsonData: any, fallback: any = {}) => {
  if (typeof jsonData === 'string') {
    try {
      return JSON.parse(jsonData);
    } catch {
      return fallback;
    }
  }
  return jsonData || fallback;
};

// Helper function to transform database row to OnboardingWorkflow
const transformWorkflow = (dbRow: any): OnboardingWorkflow => ({
  id: dbRow.id,
  tenant_id: dbRow.tenant_id,
  current_step: dbRow.current_step,
  total_steps: dbRow.total_steps,
  status: dbRow.status,
  started_at: dbRow.started_at,
  completed_at: dbRow.completed_at,
  metadata: safeJsonParse(dbRow.metadata, {}),
  tenants: dbRow.tenants
});

// Helper function to transform database row to OnboardingStep
const transformStep = (dbRow: any): OnboardingStep => ({
  id: dbRow.id,
  workflow_id: dbRow.workflow_id,
  step_number: dbRow.step_number,
  step_name: dbRow.step_name,
  step_status: dbRow.step_status as OnboardingStepStatus,
  step_data: safeJsonParse(dbRow.step_data, {}),
  validation_errors: Array.isArray(dbRow.validation_errors) ? 
    dbRow.validation_errors : 
    safeJsonParse(dbRow.validation_errors, []),
  completed_at: dbRow.completed_at,
  estimated_time: dbRow.estimated_time,
  actual_time: dbRow.actual_time
});

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

        // Transform workflows
        const transformedWorkflows = (workflowsData || []).map(transformWorkflow);

        // Fetch steps for each workflow
        const stepsData: Record<string, OnboardingStep[]> = {};
        
        for (const workflow of transformedWorkflows) {
          const { data: steps, error: stepsError } = await supabase
            .from('onboarding_steps')
            .select('*')
            .eq('workflow_id', workflow.id)
            .order('step_number');

          if (stepsError) throw stepsError;

          stepsData[workflow.id] = (steps || []).map(transformStep);
        }

        // Calculate analytics
        const analytics = calculateAnalytics(transformedWorkflows);

        setData({
          workflows: transformedWorkflows,
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
          if (payload.eventType === 'INSERT' && payload.new) {
            const newWorkflow = transformWorkflow(payload.new);
            toast.success(`New onboarding workflow started for ${newWorkflow.tenant_id}`);
            const updatedWorkflows = [newWorkflow, ...prev.workflows];
            return {
              ...prev,
              workflows: updatedWorkflows,
              analytics: calculateAnalytics(updatedWorkflows)
            };
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedWorkflow = transformWorkflow(payload.new);
            const updatedWorkflows = prev.workflows.map(w => 
              w.id === updatedWorkflow.id ? updatedWorkflow : w
            );
            
            if (updatedWorkflow.status === 'completed') {
              toast.success(`Onboarding completed for tenant!`);
            }
            
            return {
              ...prev,
              workflows: updatedWorkflows,
              analytics: calculateAnalytics(updatedWorkflows)
            };
          } else if (payload.eventType === 'DELETE' && payload.old) {
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
          // Safely get workflow_id from payload with proper type checking
          let workflowId: string | null = null;
          
          if (payload.new && typeof payload.new === 'object' && 'workflow_id' in payload.new) {
            workflowId = payload.new.workflow_id as string;
          } else if (payload.old && typeof payload.old === 'object' && 'workflow_id' in payload.old) {
            workflowId = payload.old.workflow_id as string;
          }
          
          if (!workflowId) {
            console.warn('No workflow_id found in payload:', payload);
            return prev;
          }
          
          if (payload.eventType === 'INSERT' && payload.new) {
            const newStep = transformStep(payload.new);
            return {
              ...prev,
              steps: {
                ...prev.steps,
                [workflowId]: [...(prev.steps[workflowId] || []), newStep]
              }
            };
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedStep = transformStep(payload.new);
            const updatedSteps = (prev.steps[workflowId] || []).map(step =>
              step.id === updatedStep.id ? updatedStep : step
            );
            
            if (updatedStep.step_status === 'completed') {
              toast.success(`Step "${updatedStep.step_name}" completed!`);
            } else if (updatedStep.step_status === 'failed') {
              toast.error(`Step "${updatedStep.step_name}" failed`);
            }
            
            return {
              ...prev,
              steps: {
                ...prev.steps,
                [workflowId]: updatedSteps
              }
            };
          } else if (payload.eventType === 'DELETE' && payload.old) {
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
