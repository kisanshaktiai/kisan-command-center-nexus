import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Define types for onboarding workflow and steps
export interface OnboardingWorkflow {
  id: string;
  tenant_id?: string;
  admin_id?: string;
  current_step: number;
  total_steps: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  metadata?: any;
}

export interface OnboardingStep {
  id: string;
  workflow_id: string;
  step_number: number;
  step_name: string;
  step_status: 'pending' | 'in_progress' | 'completed' | 'failed';
  step_data: any;
  validation_errors: string[];
  created_at: string;
  updated_at: string;
}

interface OnboardingContextType {
  workflow: OnboardingWorkflow | null;
  steps: OnboardingStep[];
  currentStepIndex: number;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  goToStep: (index: number) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  saveCurrentStep: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  retryFailedStep: () => Promise<void>;
  updateStepData: (data: any) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

interface OnboardingProviderProps {
  children: React.ReactNode;
  tenantId?: string | null;
  adminId?: string;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ 
  children, 
  tenantId,
  adminId 
}) => {
  const [workflow, setWorkflow] = useState<OnboardingWorkflow | null>(null);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use hardcoded templates based on context (admin vs tenant)
  const getDefaultTemplates = useCallback(() => {
    if (adminId) {
      // Admin onboarding templates
      return [
        {
          id: 'admin-setup',
          step_name: 'Admin Setup',
          step_number: 1,
          validation_schema: {},
          validation_rules: {},
          default_data: {},
          is_required: true,
          help_text: 'Configure your admin account and preferences'
        },
        {
          id: 'platform-config',
          step_name: 'Platform Configuration', 
          step_number: 2,
          validation_schema: {},
          validation_rules: {},
          default_data: {},
          is_required: true,
          help_text: 'Set up platform-wide settings and configurations'
        },
        {
          id: 'security-setup',
          step_name: 'Security Setup',
          step_number: 3,
          validation_schema: {},
          validation_rules: {},
          default_data: {},
          is_required: true,
          help_text: 'Configure security policies and access controls'
        }
      ];
    } else {
      // Tenant onboarding templates
      return [
        {
          id: 'business-info',
          step_name: 'Business Information',
          step_number: 1,
          validation_schema: {},
          validation_rules: {},
          default_data: {},
          is_required: true,
          help_text: 'Provide your business details and contact information'
        },
        {
          id: 'subscription-plan',
          step_name: 'Subscription Plan',
          step_number: 2,
          validation_schema: {},
          validation_rules: {},
          default_data: {},  
          is_required: true,
          help_text: 'Choose your subscription plan and features'
        },
        {
          id: 'branding-setup',
          step_name: 'Branding Setup',
          step_number: 3,
          validation_schema: {},
          validation_rules: {},
          default_data: {},
          is_required: false,
          help_text: 'Customize your brand colors, logo, and appearance'
        }
      ];
    }
  }, [adminId]);

  const initializeOnboarding = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const templates = getDefaultTemplates();
      
      // Create workflow if it doesn't exist
      let workflowData: OnboardingWorkflow;
      
      if (adminId) {
        // Admin workflow
        const { data: existingWorkflow } = await supabase
          .from('onboarding_workflows')
          .select('*')
          .eq('admin_id', adminId)
          .eq('status', 'in_progress')
          .single();

        if (existingWorkflow) {
          workflowData = existingWorkflow;
        } else {
          const { data: newWorkflow, error: workflowError } = await supabase
            .from('onboarding_workflows')
            .insert({
              admin_id: adminId,
              current_step: 1,
              total_steps: templates.length,
              status: 'in_progress',
              started_at: new Date().toISOString(),
              metadata: { type: 'admin' }
            })
            .select()
            .single();

          if (workflowError) throw workflowError;
          workflowData = newWorkflow;
        }
      } else if (tenantId) {
        // Tenant workflow
        const { data: existingWorkflow } = await supabase
          .from('onboarding_workflows')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('status', 'in_progress')
          .single();

        if (existingWorkflow) {
          workflowData = existingWorkflow;
        } else {
          const { data: newWorkflow, error: workflowError } = await supabase
            .from('onboarding_workflows')
            .insert({
              tenant_id: tenantId,
              current_step: 1,
              total_steps: templates.length,
              status: 'in_progress',
              started_at: new Date().toISOString(),
              metadata: { type: 'tenant' }
            })
            .select()
            .single();

          if (workflowError) throw workflowError;
          workflowData = newWorkflow;
        }
      } else {
        throw new Error('Either tenantId or adminId must be provided');
      }

      setWorkflow(workflowData);

      // Get or create steps
      const { data: existingSteps } = await supabase
        .from('onboarding_steps')
        .select('*')
        .eq('workflow_id', workflowData.id)
        .order('step_number');

      if (existingSteps && existingSteps.length > 0) {
        setSteps(existingSteps);
        setCurrentStepIndex(Math.max(0, (workflowData.current_step || 1) - 1));
      } else {
        // Create steps from templates
        const stepsToCreate = templates.map(template => ({
          workflow_id: workflowData.id,
          step_number: template.step_number,
          step_name: template.step_name,
          step_status: 'pending' as const,
          step_data: template.default_data,
          validation_errors: []
        }));

        const { data: createdSteps, error: stepsError } = await supabase
          .from('onboarding_steps')
          .insert(stepsToCreate)
          .select();

        if (stepsError) throw stepsError;
        
        setSteps(createdSteps);
        setCurrentStepIndex(0);
      }

    } catch (error) {
      console.error('Error initializing onboarding:', error);
      setError(error instanceof Error ? error.message : 'Failed to initialize onboarding');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, adminId, getDefaultTemplates]);

  useEffect(() => {
    initializeOnboarding();
  }, [initializeOnboarding]);

  const goToStep = (index: number) => {
    if (index >= 0 && index < steps.length) {
      setCurrentStepIndex(index);
    }
  };

  const goToNextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const updateStepData = (data: any) => {
    setSteps(prevSteps => 
      prevSteps.map((step, index) => 
        index === currentStepIndex 
          ? { ...step, step_data: { ...step.step_data, ...data } }
          : step
      )
    );
  };

  const saveCurrentStep = async () => {
    if (!workflow || !steps[currentStepIndex]) return;

    try {
      setIsSaving(true);
      const currentStep = steps[currentStepIndex];

      const { error } = await supabase
        .from('onboarding_steps')
        .update({
          step_data: currentStep.step_data,
          step_status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', currentStep.id);

      if (error) throw error;

      toast.success('Progress saved');
    } catch (error) {
      console.error('Error saving step:', error);
      toast.error('Failed to save progress');
    } finally {
      setIsSaving(false);
    }
  };

  const completeOnboarding = async () => {
    if (!workflow) return;

    try {
      setIsSaving(true);

      // Mark all steps as completed
      const { error: stepsError } = await supabase
        .from('onboarding_steps')
        .update({ step_status: 'completed' })
        .eq('workflow_id', workflow.id);

      if (stepsError) throw stepsError;

      // Mark workflow as completed
      const { error: workflowError } = await supabase
        .from('onboarding_workflows')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', workflow.id);

      if (workflowError) throw workflowError;

      toast.success('Onboarding completed successfully!');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to complete onboarding');
    } finally {
      setIsSaving(false);
    }
  };

  const retryFailedStep = async () => {
    if (!steps[currentStepIndex]) return;

    try {
      setIsSaving(true);
      const currentStep = steps[currentStepIndex];

      const { error } = await supabase
        .from('onboarding_steps')
        .update({
          step_status: 'pending',
          validation_errors: []
        })
        .eq('id', currentStep.id);

      if (error) throw error;

      setSteps(prevSteps =>
        prevSteps.map((step, index) =>
          index === currentStepIndex
            ? { ...step, step_status: 'pending', validation_errors: [] }
            : step
        )
      );

      toast.success('Step reset for retry');
    } catch (error) {
      console.error('Error retrying step:', error);
      toast.error('Failed to retry step');
    } finally {
      setIsSaving(false);
    }
  };

  const contextValue: OnboardingContextType = {
    workflow,
    steps,
    currentStepIndex,
    isLoading,
    isSaving,
    error,
    goToStep,
    goToNextStep,
    goToPreviousStep,
    saveCurrentStep,
    completeOnboarding,
    retryFailedStep,
    updateStepData
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
};
