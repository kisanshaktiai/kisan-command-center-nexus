
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AsyncErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  isRetrying?: boolean;
}

const AsyncErrorFallback: React.FC<AsyncErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
  isRetrying = false
}) => {
  return (
    <div className="p-4 space-y-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-4">
              <p className="font-medium">Operation Failed</p>
              <p className="text-sm mt-1 opacity-90">
                {error.message || 'An unexpected error occurred while processing your request.'}
              </p>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={resetErrorBoundary}
              disabled={isRetrying}
              className="shrink-0"
            >
              {isRetrying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </>
              )}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};

interface AsyncErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<AsyncErrorFallbackProps>;
  onRetry?: () => void;
}

export const AsyncErrorBoundary: React.FC<AsyncErrorBoundaryProps> = ({
  children,
  fallback: Fallback = AsyncErrorFallback,
  onRetry
}) => {
  return (
    <ErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <Fallback 
          error={error} 
          resetErrorBoundary={() => {
            onRetry?.();
            resetErrorBoundary();
          }}
        />
      )}
      onError={(error) => {
        console.error('Async Error Boundary caught error:', error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};
