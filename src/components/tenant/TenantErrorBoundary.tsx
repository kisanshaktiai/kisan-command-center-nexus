
import React, { useState } from 'react';
import { ErrorBoundary } from '@/components/providers/ErrorBoundary';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TenantErrorFallbackProps {
  error?: Error;
  resetErrorBoundary: () => void;
  onRetry?: () => Promise<void>;
  context?: {
    component?: string;
    level?: 'low' | 'medium' | 'high' | 'critical';
  };
}

const TenantErrorFallback: React.FC<TenantErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
  onRetry,
  context
}) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (onRetry) {
      setIsRetrying(true);
      try {
        await onRetry();
        resetErrorBoundary();
      } catch (retryError) {
        console.error('Retry failed:', retryError);
      } finally {
        setIsRetrying(false);
      }
    } else {
      resetErrorBoundary();
    }
  };

  const getErrorMessage = () => {
    if (error?.message?.includes('Network')) {
      return 'Network connection error. Please check your internet connection and try again.';
    }
    if (error?.message?.includes('403') || error?.message?.includes('Forbidden')) {
      return 'You do not have permission to perform this action.';
    }
    if (error?.message?.includes('404') || error?.message?.includes('Not Found')) {
      return 'The requested resource was not found.';
    }
    if (error?.message?.includes('500') || error?.message?.includes('Internal')) {
      return 'A server error occurred. Please try again in a moment.';
    }
    return error?.message || 'An unexpected error occurred in the tenant management system.';
  };

  return (
    <div className="p-6 space-y-4">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-3">
            <div>
              <p className="font-medium">
                {context?.level === 'critical' ? 'Critical Error' : 'Tenant Management Error'}
              </p>
              <p className="text-sm mt-1">{getErrorMessage()}</p>
              {context?.component && (
                <p className="text-xs mt-2 text-muted-foreground">
                  Component: {context.component}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleRetry}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3 mr-2" />
                    Retry
                  </>
                )}
              </Button>
              
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => window.location.reload()}
              >
                <Home className="w-3 h-3 mr-2" />
                Refresh Page
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};

interface TenantErrorBoundaryProps {
  children: React.ReactNode;
  onRetry?: () => Promise<void>;
  context?: {
    component?: string;
    level?: 'low' | 'medium' | 'high' | 'critical';
    metadata?: Record<string, any>;
  };
}

export const TenantErrorBoundary: React.FC<TenantErrorBoundaryProps> = ({
  children,
  onRetry,
  context
}) => {
  return (
    <ErrorBoundary
      fallback={(error, resetErrorBoundary) => (
        <TenantErrorFallback 
          error={error.message ? new Error(error.message) : undefined}
          resetErrorBoundary={resetErrorBoundary}
          onRetry={onRetry}
          context={context}
        />
      )}
      context={context}
    >
      {children}
    </ErrorBoundary>
  );
};
