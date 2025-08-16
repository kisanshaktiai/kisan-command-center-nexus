import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  Clock, 
  ArrowLeft, 
  ArrowRight,
  Save,
  RefreshCw,
  Home
} from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingStepForm } from './OnboardingStepForm';
import { OnboardingSummary } from './OnboardingSummary';
import { cn } from '@/lib/utils';

interface OnboardingWizardProps {
  className?: string;
  onComplete?: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ 
  className,
  onComplete 
}) => {
  const {
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
    retryFailedStep
  } = useOnboarding();

  const [showSummary, setShowSummary] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  const currentStep = steps[currentStepIndex];
  const progress = workflow ? Math.round((currentStepIndex / Math.max(steps.length - 1, 1)) * 100) : 0;
  const isLastStep = currentStepIndex === steps.length - 1;
  const isSummaryStep = showSummary;

  // Auto-save functionality
  useEffect(() => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    
    const timer = setTimeout(() => {
      if (currentStep && !isSaving) {
        saveCurrentStep();
      }
    }, 2000); // Auto-save after 2 seconds of inactivity
    
    setAutoSaveTimer(timer);
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [currentStep, isSaving, saveCurrentStep]);

  const getStepIcon = (step: any, index: number) => {
    if (step.step_status === 'completed') {
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    } else if (step.step_status === 'failed') {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    } else if (step.step_status === 'in_progress' || index === currentStepIndex) {
      return <Clock className="w-5 h-5 text-blue-500" />;
    } else {
      return <Circle className="w-5 h-5 text-gray-300" />;
    }
  };

  const getStepStatus = (step: any) => {
    switch (step.step_status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">In Progress</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const handleNext = async () => {
    if (currentStep) {
      await saveCurrentStep();
      
      if (isLastStep) {
        setShowSummary(true);
      } else {
        goToNextStep();
      }
    }
  };

  const handleComplete = async () => {
    try {
      await completeOnboarding();
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  if (isLoading) {
    return (
      <div className={cn("max-w-4xl mx-auto p-6 space-y-6", className)}>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-2 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("max-w-4xl mx-auto p-6", className)}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button
              variant="outline"
              size="sm"
              className="ml-4"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={cn("max-w-6xl mx-auto p-6 space-y-8", className)}>
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome to Your Platform Setup
        </h1>
        <p className="text-lg text-gray-600">
          Let's get your account set up in just a few steps
        </p>
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Step {currentStepIndex + 1} of {steps.length}</span>
            <span>{progress}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Step Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {steps.map((step, index) => (
          <Card
            key={step.id}
            className={cn(
              "cursor-pointer transition-all duration-200 hover:shadow-md",
              index === currentStepIndex ? "ring-2 ring-blue-500 bg-blue-50" : "",
              step.step_status === 'completed' ? "bg-green-50" : "",
              step.step_status === 'failed' ? "bg-red-50" : ""
            )}
            onClick={() => goToStep(index)}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                {getStepIcon(step, index)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {step.step_name}
                  </p>
                  <div className="mt-1">
                    {getStepStatus(step)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Card className="shadow-lg">
        <CardContent className="p-8">
          {isSummaryStep ? (
            <OnboardingSummary
              onEdit={(stepIndex) => {
                setShowSummary(false);
                goToStep(stepIndex);
              }}
              onComplete={handleComplete}
            />
          ) : currentStep ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {currentStep.step_name}
                </h2>
                <p className="text-gray-600">
                  Complete this step to continue with your setup
                </p>
              </div>

              <OnboardingStepForm
                step={currentStep}
                stepIndex={currentStepIndex}
              />

              {/* Retry Failed Step */}
              {currentStep.step_status === 'failed' && (
                <Alert variant="destructive" className="mt-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This step failed to complete. Please review and try again.
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-4"
                      onClick={retryFailedStep}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retry Step
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No step data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Footer */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={goToPreviousStep}
          disabled={currentStepIndex === 0 || isSummaryStep}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Previous</span>
        </Button>

        <div className="flex items-center space-x-4">
          {isSaving && (
            <div className="flex items-center text-sm text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Saving...
            </div>
          )}
          
          <Button
            variant="outline"
            onClick={saveCurrentStep}
            disabled={isSaving || !currentStep}
            className="flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Progress</span>
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          {isSummaryStep ? (
            <>
              <Button
                variant="outline"
                onClick={() => setShowSummary(false)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Edit
              </Button>
              <Button
                onClick={handleComplete}
                className="bg-green-600 hover:bg-green-700"
              >
                <Home className="w-4 h-4 mr-2" />
                Complete Setup
              </Button>
            </>
          ) : (
            <Button
              onClick={handleNext}
              disabled={isSaving}
              className="flex items-center space-x-2"
            >
              <span>{isLastStep ? 'Review & Complete' : 'Next Step'}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
