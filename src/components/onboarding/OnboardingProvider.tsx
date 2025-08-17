import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import { useTenantOnboardingWorkflow } from '@/hooks/useTenantOnboardingWorkflow';
import { useTenantData } from '@/hooks/useTenantData';
import { OnboardingStep } from '@/services/onboardingService';

interface OnboardingState {
  currentStepIndex: number;
  stepData: Record<string, any>;
  isTransitioning: boolean;
  validationErrors: Record<string, string[]>;
}

type OnboardingAction = 
  | { type: 'SET_CURRENT_STEP'; payload: number }
  | { type: 'UPDATE_STEP_DATA'; payload: { stepId: string; data: any } }
  | { type: 'SET_TRANSITIONING'; payload: boolean }
  | { type: 'SET_VALIDATION_ERRORS'; payload: Record<string, string[]> }
  | { type: 'CLEAR_VALIDATION_ERRORS'; payload: string };

const initialState: OnboardingState = {
  currentStepIndex: 0,
  stepData: {},
  isTransitioning: false,
  validationErrors: {}
};

function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case 'SET_CURRENT_STEP':
      return { ...state, currentStepIndex: action.payload, isTransitioning: false };
    case 'UPDATE_STEP_DATA':
      return {
        ...state,
        stepData: { ...state.stepData, [action.payload.stepId]: action.payload.data }
      };
    case 'SET_TRANSITIONING':
      return { ...state, isTransitioning: action.payload };
    case 'SET_VALIDATION_ERRORS':
      return { ...state, validationErrors: action.payload };
    case 'CLEAR_VALIDATION_ERRORS':
      return {
        ...state,
        validationErrors: { ...state.validationErrors, [action.payload]: [] }
      };
    default:
      return state;
  }
}

interface OnboardingContextValue {
  // State
  state: OnboardingState;
  steps: OnboardingStep[];
  currentStep: OnboardingStep | null;
  tenantInfo: any;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  goToStep: (index: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  updateStepData: (stepId: string, data: any) => void;
  completeStep: (stepId: string, data: any) => Promise<void>;
  validateStep: (stepId: string) => boolean;
  
  // Computed
  progress: number;
  canGoNext: boolean;
  canGoPrevious: boolean;
  totalEstimatedTime: number;
  remainingTime: number;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

interface OnboardingProviderProps {
  tenantId: string;
  workflowId?: string;
  children: React.ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({
  tenantId,
  workflowId,
  children
}) => {
  const [state, dispatch] = useReducer(onboardingReducer, initialState);
  
  const {
    workflow,
    steps,
    isLoading: workflowLoading,
    error: workflowError,
    updateStepStatus
  } = useTenantOnboardingWorkflow({
    tenantId,
    workflowId,
    autoCreate: true
  });

  const {
    data: tenantInfo,
    isLoading: tenantLoading,
    error: tenantError
  } = useTenantData({
    tenantId,
    enabled: !!tenantId
  });

  // Computed values
  const currentStep = useMemo(() => {
    return steps[state.currentStepIndex] || null;
  }, [steps, state.currentStepIndex]);

  const progress = useMemo(() => {
    if (steps.length === 0) return 0;
    const completedSteps = steps.filter(s => s.step_status === 'completed').length;
    return Math.round((completedSteps / steps.length) * 100);
  }, [steps]);

  const totalEstimatedTime = useMemo(() => {
    return steps.reduce((total, step) => {
      const stepData = step.step_data || {};
      return total + (stepData.estimated_time || 15);
    }, 0);
  }, [steps]);

  const remainingTime = useMemo(() => {
    const remainingSteps = steps.slice(state.currentStepIndex);
    return remainingSteps.reduce((total, step) => {
      const stepData = step.step_data || {};
      return total + (stepData.estimated_time || 15);
    }, 0);
  }, [steps, state.currentStepIndex]);

  const canGoNext = useMemo(() => {
    return state.currentStepIndex < steps.length - 1;
  }, [state.currentStepIndex, steps.length]);

  const canGoPrevious = useMemo(() => {
    return state.currentStepIndex > 0;
  }, [state.currentStepIndex]);

  // Actions
  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < steps.length) {
      dispatch({ type: 'SET_TRANSITIONING', payload: true });
      setTimeout(() => {
        dispatch({ type: 'SET_CURRENT_STEP', payload: index });
      }, 150);
    }
  }, [steps.length]);

  const nextStep = useCallback(() => {
    if (canGoNext) {
      goToStep(state.currentStepIndex + 1);
    }
  }, [canGoNext, state.currentStepIndex, goToStep]);

  const previousStep = useCallback(() => {
    if (canGoPrevious) {
      goToStep(state.currentStepIndex - 1);
    }
  }, [canGoPrevious, state.currentStepIndex, goToStep]);

  const updateStepData = useCallback((stepId: string, data: any) => {
    dispatch({ type: 'UPDATE_STEP_DATA', payload: { stepId, data } });
    dispatch({ type: 'CLEAR_VALIDATION_ERRORS', payload: stepId });
  }, []);

  const validateStep = useCallback((stepId: string): boolean => {
    const stepData = state.stepData[stepId] || {};
    const step = steps.find(s => s.id === stepId);
    
    if (!step) return false;
    
    const errors: string[] = [];
    
    // Basic validation - can be extended
    if (step.step_data?.required && Object.keys(stepData).length === 0) {
      errors.push('This step is required and cannot be empty');
    }
    
    if (errors.length > 0) {
      dispatch({ 
        type: 'SET_VALIDATION_ERRORS', 
        payload: { [stepId]: errors } 
      });
      return false;
    }
    
    return true;
  }, [state.stepData, steps]);

  const completeStep = useCallback(async (stepId: string, data: any) => {
    const step = steps.find(s => s.id === stepId);
    if (!step) return;

    if (!validateStep(stepId)) return;

    try {
      await updateStepStatus(step.step_number, 'completed', data);
      updateStepData(stepId, data);
      
      // Auto-advance to next step after completion
      setTimeout(() => {
        if (canGoNext) {
          nextStep();
        }
      }, 1000);
    } catch (error) {
      console.error('Failed to complete step:', error);
    }
  }, [steps, validateStep, updateStepStatus, updateStepData, canGoNext, nextStep]);

  // Fix the error type handling with proper type checking
  const errorMessage = useMemo(() => {
    const getErrorMessage = (error: unknown): string | null => {
      if (!error) return null;
      if (typeof error === 'string') return error;
      if (error && typeof error === 'object' && 'message' in error) {
        return String((error as { message: unknown }).message);
      }
      return String(error);
    };

    return getErrorMessage(workflowError) || getErrorMessage(tenantError);
  }, [workflowError, tenantError]);

  const contextValue: OnboardingContextValue = {
    state,
    steps,
    currentStep,
    tenantInfo,
    isLoading: workflowLoading || tenantLoading,
    error: errorMessage,
    goToStep,
    nextStep,
    previousStep,
    updateStepData,
    completeStep,
    validateStep,
    progress,
    canGoNext,
    canGoPrevious,
    totalEstimatedTime,
    remainingTime
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
};
