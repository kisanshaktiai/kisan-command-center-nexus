
export interface OnboardingWorkflow {
  id: string;
  tenant_id: string;
  current_step: number;
  total_steps: number;
  status: 'in_progress' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface OnboardingStep {
  id: string;
  workflow_id: string;
  step_number: number;
  step_name: string;
  step_status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  step_data: Record<string, any>;
  validation_errors: any[];
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface OnboardingStepTemplate {
  id: string;
  step_name: string;
  step_order: number;
  step_type: string;
  schema_config: Record<string, any>;
  default_data: Record<string, any>;
  validation_rules: Record<string, any>;
  is_required: boolean;
  is_active: boolean;
  help_text?: string;
  estimated_time_minutes?: number;
}

export interface OnboardingFormData {
  businessverification?: {
    companyName?: string;
    gstNumber?: string;
    panNumber?: string;
    registrationCertificate?: File | null;
    addressProof?: File | null;
  };
  planselection?: {
    planType?: 'Kisan_Basic' | 'Shakti_Growth' | 'AI_Enterprise';
    billingCycle?: 'monthly' | 'quarterly' | 'annually';
    addOns?: string[];
  };
  branding?: {
    logo?: File | null;
    primaryColor?: string;
    secondaryColor?: string;
    companyDescription?: string;
  };
  featuretoggles?: {
    enabledFeatures?: string[];
    permissions?: Record<string, boolean>;
  };
  teaminvites?: {
    invites?: Array<{
      email: string;
      role: string;
      name: string;
    }>;
  };
}

export interface OnboardingContextType {
  workflow: OnboardingWorkflow | null;
  steps: OnboardingStep[];
  templates: OnboardingStepTemplate[];
  currentStepIndex: number;
  formData: OnboardingFormData;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  validationErrors: Record<string, string[]>;
  
  // Actions
  goToStep: (stepIndex: number) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  updateStepData: (stepName: string, data: any) => Promise<void>;
  saveCurrentStep: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  retryFailedStep: () => Promise<void>;
  resetOnboarding: () => void;
}
