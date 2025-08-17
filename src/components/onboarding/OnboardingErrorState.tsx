
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
    <div className="flex items-center justify-center min-h-[500px] p-8">
      <div className="text-center space-y-6 max-w-md">
        <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Onboarding Error</h3>
          <p className="text-sm text-muted-foreground">
            {error || 'An error occurred while loading the onboarding workflow.'}
          </p>
        </div>
        
        {onRetry && (
          <Button onClick={onRetry} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
};
