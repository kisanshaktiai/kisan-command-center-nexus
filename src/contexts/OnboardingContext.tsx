
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { OnboardingContextType, OnboardingWorkflow, OnboardingStep, OnboardingStepTemplate, OnboardingFormData } from '@/types/onboarding';
import { useNotifications } from '@/hooks/useNotifications';

interface OnboardingState {
  workflow: OnboardingWorkflow | null;
  steps: OnboardingStep[];
  templates: OnboardingStepTemplate[];
  currentStepIndex: number;
  formData: OnboardingFormData;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  validationErrors: Record<string, string[]>;
}

type OnboardingAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_WORKFLOW'; payload: OnboardingWorkflow | null }
  | { type: 'SET_STEPS'; payload: OnboardingStep[] }
  | { type: 'SET_TEMPLATES'; payload: OnboardingStepTemplate[] }
  | { type: 'SET_CURRENT_STEP'; payload: number }
  | { type: 'UPDATE_FORM_DATA'; payload: { stepName: string; data: any } }
  | { type: 'SET_VALIDATION_ERRORS'; payload: Record<string, string[]> }
  | { type: 'UPDATE_STEP'; payload: OnboardingStep }
  | { type: 'RESET' };

const initialState: OnboardingState = {
  workflow: null,
  steps: [],
  templates: [],
  currentStepIndex: 0,
  formData: {},
  isLoading: false,
  isSaving: false,
  error: null,
  validationErrors: {}
};

function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_SAVING':
      return { ...state, isSaving: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_WORKFLOW':
      return { ...state, workflow: action.payload };
    case 'SET_STEPS':
      return { ...state, steps: action.payload };
    case 'SET_TEMPLATES':
      return { ...state, templates: action.payload };
    case 'SET_CURRENT_STEP':
      return { ...state, currentStepIndex: action.payload };
    case 'UPDATE_FORM_DATA':
      return {
        ...state,
        formData: {
          ...state.formData,
          [action.payload.stepName]: {
            ...state.formData[action.payload.stepName as keyof OnboardingFormData],
            ...action.payload.data
          }
        }
      };
    case 'SET_VALIDATION_ERRORS':
      return { ...state, validationErrors: action.payload };
    case 'UPDATE_STEP':
      return {
        ...state,
        steps: state.steps.map(step =>
          step.id === action.payload.id ? action.payload : step
        )
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: React.ReactNode; tenantId: string }> = ({
  children,
  tenantId
}) => {
  const [state, dispatch] = useReducer(onboardingReducer, initialState);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotifications();

  // Fetch workflow and steps
  const { data: workflowData } = useQuery({
    queryKey: ['onboarding-workflow', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-onboarding-workflow', {
        body: { tenantId }
      });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId
  });

  // Fetch step templates
  const { data: templates } = useQuery({
    queryKey: ['onboarding-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_step_templates')
        .select('*')
        .eq('is_active', true)
        .order('step_order');
      if (error) throw error;
      return data.map(template => ({
        id: template.id,
        step_name: template.step_name,
        step_order: template.step_number,
        step_type: 'form',
        schema_config: template.validation_schema as Record<string, any> || {},
        default_data: template.default_data as Record<string, any> || {},
        validation_rules: template.validation_schema as Record<string, any> || {},
        is_required: template.is_required,
        is_active: true,
        help_text: template.help_text,
        estimated_time_minutes: 30
      }));
    }
  });

  // Update step mutation
  const updateStepMutation = useMutation({
    mutationFn: async ({ stepId, data, status }: { stepId: string; data: any; status?: string }) => {
      const { data: result, error } = await supabase.functions.invoke('update-onboarding-step', {
        body: { stepId, stepData: data, status }
      });
      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      if (result.step) {
        dispatch({ type: 'UPDATE_STEP', payload: result.step });
      }
      showSuccess('Progress saved automatically');
    },
    onError: (error: any) => {
      showError('Failed to save progress', { description: error.message });
    }
  });

  // Complete onboarding mutation
  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      if (!state.workflow) throw new Error('No workflow found');
      
      const { data, error } = await supabase.functions.invoke('complete-onboarding', {
        body: { workflowId: state.workflow.id }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess('Onboarding completed successfully!');
      queryClient.invalidateQueries({ queryKey: ['onboarding-workflow'] });
    },
    onError: (error: any) => {
      showError('Failed to complete onboarding', { description: error.message });
    }
  });

  // Load data when fetched
  useEffect(() => {
    if (workflowData) {
      dispatch({ type: 'SET_WORKFLOW', payload: workflowData.workflow });
      dispatch({ type: 'SET_STEPS', payload: workflowData.steps });
      
      // Load existing form data from steps
      const formData: OnboardingFormData = {};
      workflowData.steps.forEach((step: OnboardingStep) => {
        if (step.step_data && Object.keys(step.step_data).length > 0) {
          const stepKey = step.step_name.toLowerCase().replace(/\s+/g, '');
          formData[stepKey as keyof OnboardingFormData] = step.step_data;
        }
      });
      
      // Set current step based on workflow progress
      const currentStep = Math.max(0, workflowData.workflow.current_step - 1);
      dispatch({ type: 'SET_CURRENT_STEP', payload: currentStep });
      
      // Update form data
      Object.keys(formData).forEach(stepKey => {
        dispatch({ 
          type: 'UPDATE_FORM_DATA', 
          payload: { 
            stepName: stepKey, 
            data: formData[stepKey as keyof OnboardingFormData] 
          } 
        });
      });
    }
  }, [workflowData]);

  useEffect(() => {
    if (templates) {
      dispatch({ type: 'SET_TEMPLATES', payload: templates });
    }
  }, [templates]);

  // Actions
  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < state.steps.length) {
      dispatch({ type: 'SET_CURRENT_STEP', payload: stepIndex });
    }
  }, [state.steps.length]);

  const goToNextStep = useCallback(() => {
    if (state.currentStepIndex < state.steps.length - 1) {
      dispatch({ type: 'SET_CURRENT_STEP', payload: state.currentStepIndex + 1 });
    }
  }, [state.currentStepIndex, state.steps.length]);

  const goToPreviousStep = useCallback(() => {
    if (state.currentStepIndex > 0) {
      dispatch({ type: 'SET_CURRENT_STEP', payload: state.currentStepIndex - 1 });
    }
  }, [state.currentStepIndex]);

  const updateStepData = useCallback(async (stepName: string, data: any) => {
    dispatch({ type: 'UPDATE_FORM_DATA', payload: { stepName, data } });
    
    // Auto-save after a delay
    const currentStep = state.steps[state.currentStepIndex];
    if (currentStep) {
      await updateStepMutation.mutateAsync({
        stepId: currentStep.id,
        data,
        status: 'in_progress'
      });
    }
  }, [state.steps, state.currentStepIndex, updateStepMutation]);

  const saveCurrentStep = useCallback(async () => {
    const currentStep = state.steps[state.currentStepIndex];
    const stepName = currentStep?.step_name.toLowerCase().replace(/\s+/g, '');
    const stepData = stepName ? state.formData[stepName as keyof OnboardingFormData] : {};
    
    if (currentStep && stepData) {
      dispatch({ type: 'SET_SAVING', payload: true });
      try {
        await updateStepMutation.mutateAsync({
          stepId: currentStep.id,
          data: stepData,
          status: 'completed'
        });
      } finally {
        dispatch({ type: 'SET_SAVING', payload: false });
      }
    }
  }, [state.steps, state.currentStepIndex, state.formData, updateStepMutation]);

  const completeOnboarding = useCallback(async () => {
    await completeOnboardingMutation.mutateAsync();
  }, [completeOnboardingMutation]);

  const retryFailedStep = useCallback(async () => {
    const currentStep = state.steps[state.currentStepIndex];
    if (currentStep && currentStep.step_status === 'failed') {
      await updateStepMutation.mutateAsync({
        stepId: currentStep.id,
        data: currentStep.step_data,
        status: 'pending'
      });
    }
  }, [state.steps, state.currentStepIndex, updateStepMutation]);

  const resetOnboarding = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const contextValue: OnboardingContextType = {
    ...state,
    goToStep,
    goToNextStep,
    goToPreviousStep,
    updateStepData,
    saveCurrentStep,
    completeOnboarding,
    retryFailedStep,
    resetOnboarding
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
