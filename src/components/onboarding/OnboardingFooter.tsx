
import React from 'react';
import { useOnboarding } from './OnboardingProvider';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export const OnboardingFooter: React.FC = () => {
  const { 
    currentStep,
    state: { currentStepIndex },
    steps,
    canGoNext,
    canGoPrevious,
    nextStep,
    previousStep
  } = useOnboarding();

  return (
    <div className="border-t bg-background/95 backdrop-blur-sm px-8 py-6">
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={previousStep}
          disabled={!canGoPrevious}
          className="flex items-center gap-2 px-6 py-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Previous Step
        </Button>

        <div className="text-center">
          <div className="font-semibold text-lg">
            {currentStep?.step_name || 'Loading...'}
          </div>
          <div className="text-sm text-muted-foreground">
            Step {currentStepIndex + 1} of {steps.length}
          </div>
        </div>

        <Button
          onClick={nextStep}
          disabled={!canGoNext}
          className="flex items-center gap-2 px-6 py-3"
        >
          {currentStepIndex === steps.length - 1 ? 'Complete' : 'Next Step'}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
