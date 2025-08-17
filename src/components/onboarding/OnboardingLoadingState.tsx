
import React from 'react';
import { Sparkles } from 'lucide-react';

export const OnboardingLoadingState: React.FC = () => {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center space-y-6">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-lg font-medium">
            Initializing Your Onboarding Experience
          </p>
          <p className="text-sm text-muted-foreground">
            Setting up your world-class tenant onboarding workflow...
          </p>
        </div>
      </div>
    </div>
  );
};
