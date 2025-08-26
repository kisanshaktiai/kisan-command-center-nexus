import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useStabilizedOnboardingWorkflow } from '@/hooks/useStabilizedOnboardingWorkflow';
import { useNotifications } from '@/hooks/useNotifications';
import { CompanyProfileStep } from '@/components/onboarding/steps/CompanyProfileStep';
import { EnhancedBrandingStep } from '@/components/onboarding/steps/EnhancedBrandingStep';
import { DomainWhitelabelStep } from '@/components/onboarding/steps/DomainWhitelabelStep';
import { ReviewGoLiveStep } from '@/components/onboarding/steps/ReviewGoLiveStep';
import { OnboardingDataService } from '@/services/OnboardingDataService';

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

// Define the structure of an onboarding step
interface OnboardingStep {
  id: string;
  workflow_id: string;
  step_number: number;
  step_name: string;
  step_status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  step_data: any;
}

// Component resolver - maps step names to React components
const stepComponents: { [key: string]: React.ComponentType<StepComponentProps> } = {
  'company-profile': CompanyProfileStep,
  'branding-design': EnhancedBrandingStep,
  'enhanced-branding': EnhancedBrandingStep,
  'domain-whitelabel': DomainWhitelabelStep,
  'domain-branding': DomainWhitelabelStep,
  'review-launch': ReviewGoLiveStep,
  'review-go-live': ReviewGoLiveStep
};

const resolveStepComponent = (stepName: string): React.ComponentType<StepComponentProps> | undefined => {
  return stepComponents[stepName];
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
    isLoading,
    error,
    updateStepStatus,
    retryInitialization,
    normalizeStepName
  } = useStabilizedOnboardingWorkflow({ tenantId, workflowId });
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const { showSuccess, showError } = useNotifications();

  useEffect(() => {
    if (steps && steps.length > 0) {
      const firstPendingStepIndex = steps.findIndex(step => step.step_status === 'pending');
      setCurrentStepIndex(firstPendingStepIndex >= 0 ? firstPendingStepIndex : 0);
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
      
      console.log('Completing step:', currentStep.step_name, 'with data:', stepData);

      // Save step-specific data to appropriate tables
      const saveResult = await OnboardingDataService.saveStepData({
        stepName: currentStep.step_name,
        stepData,
        tenantId,
        workflowId: workflow.id
      });

      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save step data');
      }

      // Update step status in the workflow
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
      
      // Move to next step if available
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
      } else {
        // All steps completed
        showSuccess('Onboarding completed successfully!');
        setTimeout(() => {
          onClose();
        }, 2000);
      }

    } catch (error: any) {
      console.error('Error completing step:', error);
      showError(`Failed to complete step: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStepSave = async (stepData: any) => {
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
      
      console.log('Saving step:', currentStep.step_name, 'with data:', stepData);

      // Save step-specific data to appropriate tables
      const saveResult = await OnboardingDataService.saveStepData({
        stepName: currentStep.step_name,
        stepData,
        tenantId,
        workflowId: workflow.id
      });

      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save step data');
      }

      // Update step status to in_progress with saved data
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
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
          <p className="text-lg font-medium">Step not found</p>
          <p className="text-sm text-muted-foreground mt-2">
            Unable to load the current step. Please try refreshing.
          </p>
        </div>
      );
    }

    const StepComponent = resolveStepComponent(normalizeStepName(currentStep.step_name));
    
    if (!StepComponent) {
      return (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
          <p className="text-lg font-medium">Component not found</p>
          <p className="text-sm text-muted-foreground mt-2">
            Step: {currentStep.step_name}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Normalized: {normalizeStepName(currentStep.step_name)}
          </p>
        </div>
      );
    }

    // Enhanced props with proper data handling
    const stepProps = {
      onComplete: handleStepComplete,
      onSave: handleStepSave,
      tenantId,
      workflowId: workflow?.id,
      stepData: currentStep.step_data || {},
      isLoading,
      canProceed: true,
      stepNumber: currentStep.step_number,
      totalSteps: steps.length
    };

    return <StepComponent {...stepProps} />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Tenant Onboarding Wizard</DialogTitle>
          <DialogDescription>
            Complete the following steps to configure your tenant
          </DialogDescription>
          <Tabs defaultValue={String(currentStepIndex)} className="mt-4">
            <TabsList>
              {steps.map((step, index) => (
                <TabsTrigger value={String(index)} key={step.id}>
                  Step {step.step_number}: {step.step_name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading && !workflow ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">Loading onboarding workflow...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <p className="text-lg font-medium text-red-600 mb-2">Error Loading Workflow</p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={retryInitialization} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : (
            renderCurrentStep()
          )}
        </div>

        <div className="flex justify-between p-6 border-t">
          <Button
            variant="outline"
            onClick={() => {
              if (currentStepIndex > 0) {
                setCurrentStepIndex(currentStepIndex - 1);
              }
            }}
            disabled={currentStepIndex === 0 || isLoading}
          >
            Previous
          </Button>
          <Button
            onClick={() => {
              if (currentStepIndex < steps.length - 1) {
                setCurrentStepIndex(currentStepIndex + 1);
              } else {
                onClose();
              }
            }}
            disabled={currentStepIndex === steps.length - 1 || isLoading}
          >
            {currentStepIndex === steps.length - 1 ? 'Close' : 'Next'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
