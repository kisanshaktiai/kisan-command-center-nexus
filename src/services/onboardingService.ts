import { supabase } from '@/integrations/supabase/client';

export interface OnboardingWorkflow {
  id: string;
  tenant_id: string;
  status: string;
  current_step: number;
  total_steps: number;
}

export interface OnboardingStep {
  id: string;
  workflow_id: string;
  step_number: number;
  step_name: string;
  step_status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  step_data: any;
}

export interface OnboardingTemplate {
  step: number;
  name: string;
  description: string;
  required: boolean;
  estimated_time: number;
  help_text?: string;
}

interface RemoveWorkflowResponse {
  success: boolean;
  error?: string;
  message?: string;
  workflow_id?: string;
  steps_removed?: number;
  code?: string;
}

class OnboardingService {
  async createWorkflow(tenantId: string, forceNew = false): Promise<OnboardingWorkflow> {
    console.log('🚀 Creating workflow for tenant:', tenantId);
    
    const { data, error } = await supabase.functions.invoke('start-onboarding-workflow', {
      body: { tenantId, forceNew }
    });

    if (error) {
      throw new Error(`Failed to create workflow: ${error.message}`);
    }

    if (data?.success) {
      return {
        id: data.workflow_id,
        tenant_id: tenantId,
        status: data.status,
        current_step: data.current_step,
        total_steps: data.total_steps
      };
    } else {
      throw new Error(data?.error || 'Failed to create workflow');
    }
  }

  async loadWorkflow(workflowId: string): Promise<OnboardingWorkflow> {
    console.log('📂 Loading workflow:', workflowId);
    
    const { data, error } = await supabase
      .from('onboarding_workflows')
      .select('id, tenant_id, status, current_step, total_steps')
      .eq('id', workflowId)
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async loadSteps(workflowId: string): Promise<OnboardingStep[]> {
    console.log('📋 Loading steps for workflow:', workflowId);
    
    const { data, error } = await supabase
      .from('onboarding_steps')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('step_number');

    if (error) {
      throw error;
    }

    return data || [];
  }

  async updateStepStatus(
    stepId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed',
    stepData: any = {}
  ): Promise<void> {
    const { error } = await supabase.rpc('advance_onboarding_step', {
      p_step_id: stepId,
      p_new_status: status as any,
      p_step_data: stepData
    });

    if (error) {
      throw new Error(`Failed to update step: ${error.message}`);
    }
  }

  async removeWorkflow(workflowId: string): Promise<void> {
    console.log('🗑️ Removing workflow:', workflowId);
    
    const { data, error } = await supabase.rpc('remove_onboarding_workflow', {
      p_workflow_id: workflowId
    });

    if (error) {
      throw new Error(`Failed to remove workflow: ${error.message}`);
    }

    // Type assertion since we know the structure of our RPC response
    const response = data as RemoveWorkflowResponse;
    
    if (response && !response.success) {
      throw new Error(response.error || 'Failed to remove workflow');
    }

    console.log('✅ Workflow removed successfully:', response);
  }

  normalizeStepName(stepName: string): string {
    const STEP_NAME_MAPPING: Record<string, string> = {
      'Company Profile': 'company-profile',
      'Branding & Design': 'branding-design',
      'Enhanced Branding': 'branding-design',
      'Team & Permissions': 'team-permissions',
      'Enhanced Users & Roles': 'team-permissions',
      'Users & Roles': 'team-permissions',
      'Team Setup': 'team-permissions',
      'User Management': 'team-permissions',
      'Billing & Plan': 'billing-plan',
      'Domain & White-label': 'domain-whitelabel',
      'Domain & Branding': 'domain-whitelabel',
      'Review & Launch': 'review-launch',
      'Review & Go Live': 'review-launch'
    };
    
    return STEP_NAME_MAPPING[stepName] || stepName.toLowerCase().replace(/\s+/g, '-');
  }

  getStepComponent(stepName: string) {
    // This will be imported dynamically in the component
    return stepName;
  }
}

export const onboardingService = new OnboardingService();
