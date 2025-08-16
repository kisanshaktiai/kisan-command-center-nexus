
export interface OnboardingWorkflow {
  id: string;
  tenant_id: string;
  current_step: number;
  total_steps: number;
  status: 'in_progress' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface OnboardingStep {
  id: string;
  workflow_id: string;
  step_number: number;
  step_name: string;
  step_status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  step_data: any;
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
  schema_config: any;
  default_data: any;
  validation_rules: any;
  is_required: boolean;
  is_active: boolean;
  help_text?: string;
  estimated_time_minutes?: number;
}

// Form data interfaces
export interface BusinessVerificationData {
  companyName?: string;
  gstNumber?: string;
  panNumber?: string;
  registrationCertificate?: string;
  addressProof?: string;
}

export interface PlanSelectionData {
  planType?: 'Kisan_Basic' | 'Shakti_Growth' | 'AI_Enterprise';
  billingCycle?: 'monthly' | 'quarterly' | 'annually';
  addOns?: string[];
}

export interface BrandingData {
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  companyDescription?: string;
}

export interface FeatureTogglesData {
  enabledFeatures?: string[];
  permissions?: Record<string, boolean>;
}

export interface TeamInvitesData {
  invites?: Array<{
    email: string;
    role: string;
    name: string;
  }>;
}

// Simplified form data interface
export interface OnboardingFormData {
  businessverification?: BusinessVerificationData;
  planselection?: PlanSelectionData;
  branding?: BrandingData;
  featuretoggles?: FeatureTogglesData;
  teaminvites?: TeamInvitesData;
  [key: string]: any;
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
