
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useOnboardingWorkflow } from '@/hooks/useOnboardingWorkflow';
import { useNotifications } from '@/hooks/useNotifications';

// Import step-specific components
import { BusinessVerificationStep } from './steps/BusinessVerificationStep';
import { TeamSetupStep } from './steps/TeamSetupStep';
import { DomainSetupStep } from './steps/DomainSetupStep';
import { WhiteLabelSetupStep } from './steps/WhiteLabelSetupStep';
import { ReviewStep } from './steps/ReviewStep';

interface ConsolidatedTenantOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  workflowId?: string;
}

export const ConsolidatedTenantOnboardingWizard: React.FC<ConsolidatedTenantOnboardingWizardProps> = ({
  isOpen,
  onClose,
  tenantId,
  workflowId
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const { workflow, steps, isLoading, error, updateStepStatus } = useOnboardingWorkflow({
    tenantId,
    workflowId,
    autoCreate: true
  });
  const { showSuccess, showError } = useNotifications();

  // Calculate actual completion percentage based on completed steps
  const completedSteps = steps.filter(step => step.step_status === 'completed');
  const completionPercentage = steps.length > 0 ? Math.round((completedSteps.length / steps.length) * 100) : 0;

  const currentStep = steps[currentStepIndex];
  const isCurrentStepCompleted = currentStep?.step_status === 'completed';
  const canProceedToNext = currentStepIndex < steps.length - 1;
  const canGoBack = currentStepIndex > 0;

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStepComponent = (step: any) => {
    if (!step) return null;

    const commonProps = {
      stepData: step.step_data || {},
      onComplete: handleStepComplete,
      onNext: handleNextStep,
      isCompleted: step.step_status === 'completed'
    };

    switch (step.step_name.toLowerCase()) {
      case 'business verification':
        return <BusinessVerificationStep {...commonProps} />;
      case 'team setup':
        return <TeamSetupStep {...commonProps} />;
      case 'domain setup':
        return <DomainSetupStep {...commonProps} />;
      case 'white-label setup':
      case 'white label setup':
      case 'branding setup':
        return <WhiteLabelSetupStep {...commonProps} />;
      case 'review':
      case 'review & launch':
      case 'go-live testing':
        return <ReviewStep {...commonProps} allStepsData={steps} />;
      default:
        return (
          <div className="text-center py-8">
            <h3 className="text-lg font-medium mb-2">{step.step_name}</h3>
            <p className="text-muted-foreground mb-4">
              {step.step_data?.description || 'This step is being configured.'}
            </p>
            <Button onClick={() => handleStepComplete({})}>
              Mark as Complete
            </Button>
          </div>
        );
    }
  };

  const handleStepComplete = async (stepData: any) => {
    if (!currentStep) return;

    try {
      await updateStepStatus(currentStep.step_number, 'completed', stepData);
      showSuccess(`${currentStep.step_name} completed successfully`);
    } catch (error) {
      showError(`Failed to complete ${currentStep.step_name}`);
    }
  };

  const handleNextStep = () => {
    if (canProceedToNext) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePreviousStep = () => {
    if (canGoBack) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    // Allow navigation to any step that's completed or is the next step in sequence
    const targetStep = steps[stepIndex];
    const isAccessible = targetStep.step_status === 'completed' || 
                        stepIndex === 0 || 
                        steps.slice(0, stepIndex).every(s => s.step_status === 'completed');
    
    if (isAccessible) {
      setCurrentStepIndex(stepIndex);
    }
  };

  const handleClose = () => {
    if (completionPercentage === 100) {
      showSuccess('Onboarding completed successfully! 🎉');
    }
    onClose();
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading onboarding workflow...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Error Loading Onboarding</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={handleClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Tenant Onboarding Wizard</span>
            <Badge variant="secondary" className="ml-2">
              {completionPercentage}% Complete
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Complete your tenant setup with our guided onboarding process
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-full max-h-[80vh]">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Progress</span>
              <span>{completedSteps.length} of {steps.length} steps completed</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>

          {/* Step Navigation */}
          <div className="flex overflow-x-auto gap-2 mb-6 pb-2">
            {steps.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isCompleted = step.step_status === 'completed';
              const isAccessible = isCompleted || index === 0 || 
                                 steps.slice(0, index).every(s => s.step_status === 'completed');

              return (
                <button
                  key={step.id}
                  onClick={() => handleStepClick(index)}
                  disabled={!isAccessible}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : isCompleted
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : isAccessible
                      ? 'bg-muted hover:bg-muted/80'
                      : 'bg-muted/50 text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  {getStepIcon(step.step_status)}
                  <span>{step.step_name}</span>
                  {isCompleted && <CheckCircle className="w-3 h-3" />}
                </button>
              );
            })}
          </div>

          {/* Current Step Content */}
          <div className="flex-1 overflow-y-auto">
            {currentStep ? (
              getStepComponent(currentStep)
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No steps available</p>
              </div>
            )}
          </div>

          {/* Navigation Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Step {currentStepIndex + 1} of {steps.length}
              </span>
              {currentStep && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <Badge variant={isCurrentStepCompleted ? 'default' : 'secondary'}>
                    {isCurrentStepCompleted ? 'Completed' : 'In Progress'}
                  </Badge>
                </>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePreviousStep}
                disabled={!canGoBack}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              
              {canProceedToNext ? (
                <Button
                  onClick={handleNextStep}
                  disabled={!isCurrentStepCompleted}
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleClose}>
                  {completionPercentage === 100 ? 'Finish' : 'Close'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
