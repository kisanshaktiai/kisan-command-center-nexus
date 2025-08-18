
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBannerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  variant?: 'default' | 'destructive';
  className?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  title = 'Error',
  message,
  onRetry,
  retryLabel = 'Retry',
  variant = 'destructive',
  className = ''
}) => {
  return (
    <Alert variant={variant} className={`${className} mb-4`}>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-medium">{title}</p>
          <p className="text-sm mt-1">{message}</p>
        </div>
        {onRetry && (
          <Button
            size="sm"
            onClick={onRetry}
            className="ml-4 shrink-0"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {retryLabel}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};
