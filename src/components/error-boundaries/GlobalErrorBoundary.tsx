
import React, { ErrorInfo, ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface GlobalErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const GlobalErrorFallback: React.FC<GlobalErrorFallbackProps> = ({
  error,
  resetErrorBoundary
}) => {
  const handleReportError = () => {
    // In a real app, this would send to an error reporting service
    console.error('User reported error:', { error, stack: error.stack });
    toast.success('Error reported. Thank you for helping us improve!');
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            We encountered an unexpected error. This has been logged and our team will investigate.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm font-mono text-muted-foreground break-all">
              {error.message}
            </p>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button onClick={resetErrorBoundary} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            
            <Button variant="outline" onClick={handleReportError} className="w-full">
              <Bug className="w-4 h-4 mr-2" />
              Report Issue
            </Button>
            
            <Button variant="ghost" onClick={handleReload} className="w-full">
              Reload Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface GlobalErrorBoundaryProps {
  children: ReactNode;
}

export const GlobalErrorBoundary: React.FC<GlobalErrorBoundaryProps> = ({
  children
}) => {
  return (
    <ErrorBoundary
      FallbackComponent={GlobalErrorFallback}
      onError={(error: Error, errorInfo: ErrorInfo) => {
        // Log to console for development
        console.error('Global Error Boundary caught an error:', error, errorInfo);
        
        // In production, this would send to an error reporting service
        if (process.env.NODE_ENV === 'production') {
          // Example: Sentry.captureException(error, { extra: errorInfo });
        }
      }}
    >
      {children}
    </ErrorBoundary>
  );
};
