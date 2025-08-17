
import React from 'react';
import { useOnboarding } from './OnboardingProvider';
import { OnboardingHeader } from './OnboardingHeader';
import { OnboardingSidebar } from './OnboardingSidebar';
import { OnboardingStepContent } from './OnboardingStepContent';
import { OnboardingFooter } from './OnboardingFooter';
import { OnboardingLoadingState } from './OnboardingLoadingState';
import { OnboardingErrorState } from './OnboardingErrorState';
import { OnboardingErrorBoundary } from './OnboardingErrorBoundary';

export const OnboardingContent: React.FC = () => {
  const { isLoading, error, steps } = useOnboarding();

  if (isLoading) {
    return <OnboardingLoadingState />;
  }

  if (error) {
    return <OnboardingErrorState error={error} />;
  }

  if (steps.length === 0) {
    return <OnboardingErrorState error="No onboarding steps available" />;
  }

  return (
    <OnboardingErrorBoundary>
      <div className="flex flex-1 overflow-hidden">
        <OnboardingSidebar />
        
        <div className="flex-1 flex flex-col">
          <OnboardingHeader />
          
          <div className="flex-1 overflow-y-auto">
            <OnboardingStepContent />
          </div>
          
          <OnboardingFooter />
        </div>
      </div>
    </OnboardingErrorBoundary>
  );
};
