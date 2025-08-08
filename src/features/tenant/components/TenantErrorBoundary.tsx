
import React from 'react';
import { ErrorBoundary } from '@/components/providers/ErrorBoundary';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TenantErrorFallbackProps {
  error?: Error;
  resetErrorBoundary: () => void;
}

const TenantErrorFallback: React.FC<TenantErrorFallbackProps> = ({
  error,
  resetErrorBoundary
}) => {
  return (
    <div className="p-6 space-y-4">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Tenant Management Error</p>
              <p className="text-sm mt-1">
                {error?.message || 'Something went wrong with tenant management. Please try again.'}
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
    </div>
  );
};

interface TenantErrorBoundaryProps {
  children: React.ReactNode;
}

export const TenantErrorBoundary: React.FC<TenantErrorBoundaryProps> = ({
  children
}) => {
  return (
    <ErrorBoundary
      fallback={<TenantErrorFallback error={undefined} resetErrorBoundary={() => {}} />}
      context={{
        component: 'TenantManagement',
        level: 'high',
        metadata: { module: 'tenant-management' }
      }}
    >
      {children}
    </ErrorBoundary>
  );
};
