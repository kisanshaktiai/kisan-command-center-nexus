
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Check, Clock, ArrowLeft, ArrowRight } from 'lucide-react';
import { useStabilizedOnboardingWorkflow } from '@/hooks/useStabilizedOnboardingWorkflow';
import { useNotifications } from '@/hooks/useNotifications';
import { CompanyProfileStep } from '@/components/onboarding/steps/CompanyProfileStep';
import { EnhancedBrandingStep } from '@/components/onboarding/steps/EnhancedBrandingStep';
import { DomainWhitelabelStep } from '@/components/onboarding/steps/DomainWhitelabelStep';
import { ReviewGoLiveStep } from '@/components/onboarding/steps/ReviewGoLiveStep';

interface ConsolidatedTenantOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  workflowId?: string;
}

interface StepComponentProps {
  onComplete: (data: any) => void;
  onSave: (data: any) => void;
  tenantId: string;
  workflowId?: string;
  stepData?: any;
  isLoading?: boolean;
  canProceed?: boolean;
  stepNumber: number;
  totalSteps: number;
}

interface OnboardingStep {
  id: string;
  workflow_id: string;
  step_number: number;
  step_name: string;
  step_status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  step_data: any;
}

// Simple step component mapping
const STEP_COMPONENTS: { [key: string]: React.ComponentType<StepComponentProps> } = {
  'company-profile': CompanyProfileStep,
  'enhanced-branding': EnhancedBrandingStep,
  'domain-whitelabel': DomainWhitelabelStep,
  'review-go-live': ReviewGoLiveStep,
};

// Get step component with fallback
const getStepComponent = (stepName: string): React.ComponentType<StepComponentProps> => {
  const normalizedName = stepName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  
  // Direct match
  if (STEP_COMPONENTS[normalizedName]) {
    return STEP_COMPONENTS[normalizedName];
  }
  
  // Pattern matching for common variations
  if (normalizedName.includes('company') || normalizedName.includes('profile')) {
    return CompanyProfileStep;
  }
  if (normalizedName.includes('brand') || normalizedName.includes('design')) {
    return EnhancedBrandingStep;
  }
  if (normalizedName.includes('domain') || normalizedName.includes('whitelabel')) {
    return DomainWhitelabelStep;
  }
  if (normalizedName.includes('review') || normalizedName.includes('launch') || normalizedName.includes('live')) {
    return ReviewGoLiveStep;
  }
  
  // Default fallback
  return CompanyProfileStep;
};

export const ConsolidatedTenantOnboardingWizard: React.FC<ConsolidatedTenantOnboardingWizardProps> = ({
  isOpen,
  onClose,
  tenantId,
  workflowId
}) => {
  const {
    workflow,
    steps,
    isLoading: workflowLoading,
    error,
    updateStepStatus,
    retryInitialization
  } = useStabilizedOnboardingWorkflow({ tenantId, workflowId });
  
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError } = useNotifications();

  useEffect(() => {
    if (steps && steps.length > 0) {
      const firstPendingStep = steps.findIndex(step => step.step_status === 'pending');
      setCurrentStepIndex(firstPendingStep >= 0 ? firstPendingStep : 0);
    }
  }, [steps]);

  const handleStepComplete = async (stepData: any) => {
    if (!workflow || !tenantId) {
      showError('Missing workflow or tenant information');
      return;
    }

    const currentStep = steps[currentStepIndex];
    if (!currentStep) {
      showError('Current step not found');
      return;
    }

    try {
      setIsLoading(true);
      
      // Update step status
      await updateStepStatus(
        currentStep.step_number,
        'completed',
        {
          ...stepData,
          completed_at: new Date().toISOString(),
          completed_by: 'user'
        }
      );

      showSuccess(`${currentStep.step_name} completed successfully!`);
      
      // Move to next step
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
      } else {
        showSuccess('Onboarding completed successfully!');
        setTimeout(() => onClose(), 2000);
      }

    } catch (error: any) {
      console.error('Error completing step:', error);
      showError(`Failed to complete step: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStepSave = async (stepData: any) => {
    if (!workflow || !tenantId) return;

    const currentStep = steps[currentStepIndex];
    if (!currentStep) return;

    try {
      setIsLoading(true);
      
      await updateStepStatus(
        currentStep.step_number,
        'in_progress',
        {
          ...stepData,
          saved_at: new Date().toISOString(),
          auto_saved: true
        }
      );

      showSuccess('Progress saved successfully!');
      
    } catch (error: any) {
      console.error('Error saving step:', error);
      showError(`Failed to save progress: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderCurrentStep = () => {
    const currentStep = steps[currentStepIndex];
    if (!currentStep) {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <AlertCircle className="w-16 h-16 text-muted-foreground" />
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Step Not Found</h3>
            <p className="text-sm text-muted-foreground">
              Unable to load the current step. Please try refreshing.
            </p>
          </div>
          <Button onClick={retryInitialization} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      );
    }

    const StepComponent = getStepComponent(currentStep.step_name);

    const stepProps: StepComponentProps = {
      onComplete: handleStepComplete,
      onSave: handleStepSave,
      tenantId,
      workflowId: workflow?.id,
      stepData: currentStep.step_data || {},
      isLoading: isLoading || workflowLoading,
      canProceed: true,
      stepNumber: currentStep.step_number,
      totalSteps: steps.length
    };

    return <StepComponent {...stepProps} />;
  };

  const getProgressPercentage = () => {
    if (!steps || steps.length === 0) return 0;
    const completed = steps.filter(step => step.step_status === 'completed').length;
    return Math.round((completed / steps.length) * 100);
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed': return <Check className="w-4 h-4 text-green-600" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-blue-600 animate-pulse" />;
      default: return <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />;
    }
  };

  const canNavigateToStep = (stepIndex: number) => {
    if (stepIndex === 0) return true;
    return steps[stepIndex - 1]?.step_status === 'completed';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] p-0">
        <div className="flex h-[90vh]">
          {/* Sidebar */}
          <div className="w-80 bg-muted/30 border-r p-6 overflow-y-auto">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-xl">Tenant Onboarding</DialogTitle>
              <DialogDescription>
                Complete setup in {steps?.length || 0} steps ({getProgressPercentage()}% complete)
              </DialogDescription>
            </DialogHeader>

            {/* Progress Steps */}
            <div className="space-y-3">
              {steps?.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => canNavigateToStep(index) && setCurrentStepIndex(index)}
                  disabled={!canNavigateToStep(index)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                    index === currentStepIndex
                      ? 'bg-primary text-primary-foreground'
                      : canNavigateToStep(index)
                      ? 'hover:bg-muted cursor-pointer'
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {getStepIcon(step.step_status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {step.step_number}. {step.step_name}
                    </div>
                    <div className="text-xs opacity-75 capitalize">
                      {step.step_status.replace('_', ' ')}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="border-b p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    {steps?.[currentStepIndex]?.step_name || 'Loading...'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Step {currentStepIndex + 1} of {steps?.length || 0}
                  </p>
                </div>
                <div className="w-32 bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getProgressPercentage()}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Step Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {workflowLoading && !workflow ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                    <p className="text-muted-foreground">Loading onboarding workflow...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
                    <div>
                      <h3 className="text-lg font-semibold text-destructive mb-2">Error Loading Workflow</h3>
                      <p className="text-sm text-muted-foreground mb-4">{error}</p>
                      <Button onClick={retryInitialization} variant="outline">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Retry
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                renderCurrentStep()
              )}
            </div>

            {/* Footer Navigation */}
            <div className="border-t p-6">
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
                  disabled={currentStepIndex === 0 || isLoading}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                
                <div className="flex gap-2">
                  {currentStepIndex < (steps?.length || 0) - 1 ? (
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStepIndex(Math.min((steps?.length || 0) - 1, currentStepIndex + 1))}
                      disabled={isLoading}
                    >
                      Skip for Now
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      onClick={onClose}
                      disabled={isLoading}
                    >
                      Close Wizard
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
