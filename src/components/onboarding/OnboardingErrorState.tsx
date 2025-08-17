
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OnboardingErrorStateProps {
  error: string;
  onRetry?: () => void;
}

export const OnboardingErrorState: React.FC<OnboardingErrorStateProps> = ({ 
  error, 
  onRetry 
}) => {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center space-y-6 max-w-md">
        <AlertCircle className="w-16 h-16 text-destructive mx-auto opacity-50" />
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Unable to Load Onboarding</h3>
          <p className="text-sm text-muted-foreground">
            {error || 'An unexpected error occurred while loading the onboarding workflow'}
          </p>
          {onRetry && (
            <Button onClick={onRetry} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
