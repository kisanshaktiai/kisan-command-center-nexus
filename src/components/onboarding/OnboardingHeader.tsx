
import React from 'react';
import { useOnboarding } from './OnboardingProvider';
import { Progress } from '@/components/ui/progress';

export const OnboardingHeader: React.FC = () => {
  const { 
    progress, 
    tenantInfo, 
    steps, 
    state: { currentStepIndex },
    remainingTime 
  } = useOnboarding();

  return (
    <div className="border-b bg-background/95 backdrop-blur-sm px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">
            {tenantInfo?.name || 'Loading...'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {tenantInfo?.subscription_plan || 'Loading...'} Plan • Step {currentStepIndex + 1} of {steps.length}
          </p>
        </div>
        
        <div className="text-right space-y-1">
          <div className="text-2xl font-bold text-primary">{progress}%</div>
          <div className="text-sm text-muted-foreground">
            ~{remainingTime} min remaining
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        <Progress value={progress} className="w-full h-3 bg-muted" />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Progress: {progress}% complete</span>
          <span>Estimated time remaining: ~{remainingTime} minutes</span>
        </div>
      </div>
    </div>
  );
};
