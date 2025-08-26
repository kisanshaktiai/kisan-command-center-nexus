
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

// Enhanced step component mapping with pattern matching
const STEP_COMPONENTS: { [key: string]: React.ComponentType<StepComponentProps> } = {
  // Company Profile variations
  'company-profile': CompanyProfileStep,
  'company_profile': CompanyProfileStep,
  'companyprofile': CompanyProfileStep,
  
  // Branding variations  
  'branding-design': EnhancedBrandingStep,
  'branding_design': EnhancedBrandingStep,
  'enhanced-branding': EnhancedBrandingStep,
  'enhanced_branding': EnhancedBrandingStep,
  'brandingdesign': EnhancedBrandingStep,
  'enhancedbranding': EnhancedBrandingStep,
  
  // Domain variations
  'domain-whitelabel': DomainWhitelabelStep,
  'domain_whitelabel': DomainWhitelabelStep,
  'domain-branding': DomainWhitelabelStep,
  'domain_branding': DomainWhitelabelStep,
  'domainwhitelabel': DomainWhitelabelStep,
  'domainbranding': DomainWhitelabelStep,
  
  // Review variations
  'review-launch': ReviewGoLiveStep,
  'review_launch': ReviewGoLiveStep,
  'review-go-live': ReviewGoLiveStep,
  'review_go_live': ReviewGoLiveStep,
  'reviewlaunch': ReviewGoLiveStep,
  'reviewgolive': ReviewGoLiveStep
};

// Intelligent component resolver with pattern matching
const resolveStepComponent = (stepName: string): React.ComponentType<StepComponentProps> | undefined => {
  console.log('Resolving component for step:', stepName);
  
  // Direct lookup first
  const normalized = stepName.toLowerCase().replace(/[^a-z0-9]/g, '');
  let component = STEP_COMPONENTS[normalized];
  
  if (component) {
    console.log('Found component via direct lookup:', normalized);
    return component;
  }
  
  // Pattern matching for variations
  if (normalized.includes('company') || normalized.includes('profile')) {
    console.log('Matched company profile pattern');
    return CompanyProfileStep;
  }
  
  if (normalized.includes('brand') || normalized.includes('design')) {
    console.log('Matched branding pattern');
    return EnhancedBrandingStep;
  }
  
  if (normalized.includes('domain') || normalized.includes('whitelabel')) {
    console.log('Matched domain pattern');
    return DomainWhitelabelStep;
  }
  
  if (normalized.includes('review') || normalized.includes('launch') || normalized.includes('live')) {
    console.log('Matched review pattern');
    return ReviewGoLiveStep;
  }
  
  console.warn('No component found for step:', stepName, 'normalized:', normalized);
  return undefined;
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
    retryInitialization,
    normalizeStepName
  } = useStabilizedOnboardingWorkflow({ tenantId, workflowId });
  
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
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

    const StepComponent = resolveStepComponent(currentStep.step_name);
    
    if (!StepComponent) {
      return (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
          <p className="text-lg font-medium">Component not found</p>
          <p className="text-sm text-muted-foreground mt-2">
            Step: {currentStep.step_name}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Available components: {Object.keys(STEP_COMPONENTS).join(', ')}
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
      isLoading: isLoading || workflowLoading,
      canProceed: true,
      stepNumber: currentStep.step_number,
      totalSteps: steps.length
    };

    return <StepComponent {...stepProps} />;
  };

  const calculateProgress = () => {
    if (!steps || steps.length === 0) return 0;
    
    const completedSteps = steps.filter(step => 
      step.step_status === 'completed' || step.step_status === 'skipped'
    ).length;
    
    return Math.round((completedSteps / steps.length) * 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Tenant Onboarding Wizard</DialogTitle>
          <DialogDescription>
            Complete the following steps to configure your tenant ({calculateProgress()}% complete)
          </DialogDescription>
          {steps && steps.length > 0 && (
            <Tabs value={String(currentStepIndex)} className="mt-4">
              <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>
                {steps.map((step, index) => (
                  <TabsTrigger 
                    value={String(index)} 
                    key={step.id}
                    className={`text-xs ${
                      step.step_status === 'completed' ? 'bg-green-100 text-green-800' :
                      step.step_status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      step.step_status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-600'
                    }`}
                    onClick={() => {
                      // Allow navigation to any step that's not pending
                      if (step.step_status !== 'pending' || index <= currentStepIndex) {
                        setCurrentStepIndex(index);
                      }
                    }}
                  >
                    {step.step_number}: {step.step_name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {workflowLoading && !workflow ? (
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
