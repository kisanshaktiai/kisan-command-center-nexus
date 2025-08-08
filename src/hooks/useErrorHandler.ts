
import { useCallback } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { unifiedErrorService } from '@/services/core/UnifiedErrorService';

export interface UseErrorHandlerOptions {
  component?: string;
  fallbackMessage?: string;
  logToServer?: boolean;
}

export const useErrorHandler = (options: UseErrorHandlerOptions = {}) => {
  const { showError, showWarning } = useNotifications();
  
  const handleError = useCallback((
    error: unknown,
    action?: string,
    customOptions?: Partial<UseErrorHandlerOptions>
  ) => {
    const mergedOptions = { ...options, ...customOptions };
    
    const errorResult = unifiedErrorService.processError(
      error,
      unifiedErrorService.createContext(
        mergedOptions.component || 'Unknown',
        action
      ),
      {
        logToConsole: true,
        logToServer: mergedOptions.logToServer || false,
        fallbackMessage: mergedOptions.fallbackMessage
      }
    );

    // Show appropriate notification
    if (errorResult.notificationType === 'warning') {
      showWarning(errorResult.userMessage);
    } else {
      showError(errorResult.userMessage);
    }

    return errorResult;
  }, [showError, showWarning, options]);

  const handleAsyncError = useCallback(async <T>(
    asyncOperation: () => Promise<T>,
    action?: string,
    customOptions?: Partial<UseErrorHandlerOptions>
  ): Promise<T | null> => {
    try {
      return await asyncOperation();
    } catch (error) {
      handleError(error, action, customOptions);
      return null;
    }
  }, [handleError]);

  return {
    handleError,
    handleAsyncError
  };
};
