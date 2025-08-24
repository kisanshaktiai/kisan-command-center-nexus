
import { useState, useCallback } from 'react';
import { errorLogger } from '@/services/error/ErrorLogger';

interface ErrorState {
  hasError: boolean;
  errorId: string;
  error: Error | null;
}

interface UseErrorHandlerOptions {
  context?: {
    component?: string;
    level?: 'low' | 'medium' | 'high' | 'critical';
    metadata?: Record<string, any>;
  };
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export const useErrorHandler = (options: UseErrorHandlerOptions = {}) => {
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    errorId: '',
    error: null
  });

  const handleError = useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    const errorId = errorLogger.logError(error, errorInfo, options.context);
    
    setErrorState({
      hasError: true,
      errorId,
      error
    });

    if (options.onError) {
      options.onError(error, errorInfo);
    }
  }, [options]);

  const resetError = useCallback(() => {
    setErrorState({
      hasError: false,
      errorId: '',
      error: null
    });
  }, []);

  const copyErrorDetails = useCallback(() => {
    if (errorState.error) {
      const errorText = `Error: ${errorState.error.message}\nID: ${errorState.errorId}\nTime: ${new Date().toISOString()}`;
      navigator.clipboard.writeText(errorText);
    }
  }, [errorState]);

  return {
    errorState,
    handleError,
    resetError,
    copyErrorDetails
  };
};
