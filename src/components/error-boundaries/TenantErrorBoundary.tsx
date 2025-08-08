
import React from 'react';
import { ErrorBoundary } from '@/components/providers/ErrorBoundary';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface TenantErrorFallbackProps {
  error?: Error;
  resetErrorBoundary: () => void;
}

const TenantErrorFallback: React.FC<TenantErrorFallbackProps> = ({
  error,
  resetErrorBoundary
}) => {
  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle className="text-xl font-semibold">
            Tenant Management Error
          </CardTitle>
          <CardDescription>
            Something went wrong while managing tenants
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                <strong>Error:</strong> {error.message}
              </p>
            </div>
          )}

          <div className="flex flex-col space-y-2">
            <Button onClick={resetErrorBoundary} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleGoBack} 
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            If this problem persists, please contact support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export const TenantErrorBoundary: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  return (
    <ErrorBoundary
      fallback={(props: { error?: Error; resetErrorBoundary: () => void }) => (
        <TenantErrorFallback {...props} />
      )}
      context={{
        component: 'TenantManagement',
        level: 'high',
        metadata: { feature: 'tenant-management' }
      }}
    >
      {children}
    </ErrorBoundary>
  );
};
