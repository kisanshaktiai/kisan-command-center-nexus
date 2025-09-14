
import React from 'react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface QueryErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const QueryErrorFallback: React.FC<QueryErrorFallbackProps> = ({
  error,
  resetErrorBoundary
}) => {
  const handleRetry = () => {
    resetErrorBoundary();
    toast.success('Retrying...', { duration: 1000 });
  };

  return (
    <div className="p-6 space-y-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Query Error</p>
              <p className="text-sm mt-1">
                {error?.message || 'Failed to load data. Please try again.'}
              </p>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleRetry}
              className="ml-4"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};

interface QueryErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<QueryErrorFallbackProps>;
}

export const QueryErrorBoundary: React.FC<QueryErrorBoundaryProps> = ({
  children,
  fallback: Fallback = QueryErrorFallback
}) => {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <React.Suspense fallback={<div>Loading...</div>}>
          {children}
        </React.Suspense>
      )}
    </QueryErrorResetBoundary>
  );
};
