
import React from 'react';
import { Loader2 } from 'lucide-react';

export const OnboardingLoadingState: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-[500px]">
      <div className="text-center space-y-4">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <div className="absolute inset-0 w-12 h-12 border-4 border-primary/20 rounded-full mx-auto"></div>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Loading Onboarding</h3>
          <p className="text-sm text-muted-foreground">
            Setting up your onboarding workflow...
          </p>
        </div>
        <div className="w-64 h-2 bg-muted rounded-full mx-auto overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-pulse w-1/3"></div>
        </div>
      </div>
    </div>
  );
};
