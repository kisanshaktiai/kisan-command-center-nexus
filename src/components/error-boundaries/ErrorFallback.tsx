
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Home, Copy } from 'lucide-react';

export interface ErrorInfo {
  message: string;
  stack?: string;
  componentStack?: string;
  errorId: string;
  timestamp: string;
}

interface ErrorFallbackProps {
  error: ErrorInfo;
  onRetry: () => void;
  onGoHome?: () => void;
  onCopyError?: () => void;
  context?: {
    component?: string;
    level?: 'low' | 'medium' | 'high' | 'critical';
  };
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  onRetry,
  onGoHome,
  onCopyError,
  context
}) => {
  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      window.location.href = '/';
    }
  };

  const handleCopyError = () => {
    if (onCopyError) {
      onCopyError();
    } else {
      const errorText = `Error: ${error.message}\nID: ${error.errorId}\nTime: ${error.timestamp}`;
      navigator.clipboard.writeText(errorText);
    }
  };

  const getLevelColor = () => {
    switch (context?.level) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 p-4">
      <Card className={`w-full max-w-md ${getLevelColor()}`}>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-red-800">
            {context?.level === 'critical' ? 'Critical Error' : 'Something went wrong'}
          </CardTitle>
          <CardDescription className="text-red-600">
            {context?.component ? `Error in ${context.component}` : 'An unexpected error occurred'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Error Details:</p>
                <p className="text-sm">{error.message}</p>
                <p className="text-xs text-muted-foreground">
                  Error ID: {error.errorId}
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <div className="flex flex-col space-y-2">
            <Button onClick={onRetry} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleGoHome} 
              className="w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Home
            </Button>

            <Button 
              variant="ghost" 
              onClick={handleCopyError} 
              className="w-full text-xs"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Error Details
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              If this problem persists, please contact support with the error ID above.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
