
import React from 'react';
import { ErrorBoundary } from '@/components/providers/ErrorBoundary';
import { Database, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DataErrorFallbackProps {
  error?: Error;
  resetErrorBoundary: () => void;
}

const DataErrorFallback: React.FC<DataErrorFallbackProps> = ({
  error,
  resetErrorBoundary
}) => {
  return (
    <div className="p-6 space-y-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Data Loading Error</p>
              <p className="text-sm mt-1">
                {error?.message || 'Unable to load data. Please try again.'}
              </p>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={resetErrorBoundary}
              className="ml-4"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            There was a problem loading the requested data.
          </p>
        </div>
      </div>
    </div>
  );
};

export const DataErrorBoundary: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  return (
    <ErrorBoundary
      fallback={({ error, resetErrorBoundary }) => (
        <DataErrorFallback 
          error={error} 
          resetErrorBoundary={resetErrorBoundary} 
        />
      )}
      context={{
        component: 'DataLayer',
        level: 'medium',
        metadata: { layer: 'data-access' }
      }}
    >
      {children}
    </ErrorBoundary>
  );
};
