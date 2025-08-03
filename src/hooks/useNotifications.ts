
import { useCallback } from 'react';
import { toast } from 'sonner';

export interface NotificationOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ErrorNotificationOptions extends NotificationOptions {
  fallbackMessage?: string;
}

/**
 * Centralized notification hook
 * Provides consistent notification handling across the application
 */
export const useNotifications = () => {
  const showSuccess = useCallback((message: string, options?: NotificationOptions) => {
    toast.success(message, {
      description: options?.description,
      duration: options?.duration,
      action: options?.action
    });
  }, []);

  const showError = useCallback((message: string, options?: ErrorNotificationOptions) => {
    toast.error(message, {
      description: options?.description || 'Please try again later or contact support if the problem persists.',
      duration: options?.duration,
      action: options?.action
    });
  }, []);

  const showWarning = useCallback((message: string, options?: NotificationOptions) => {
    toast.warning(message, {
      description: options?.description,
      duration: options?.duration,
      action: options?.action
    });
  }, []);

  const showInfo = useCallback((message: string, options?: NotificationOptions) => {
    toast.info(message, {
      description: options?.description,
      duration: options?.duration,
      action: options?.action
    });
  }, []);

  const showLoading = useCallback((message: string, options?: NotificationOptions) => {
    return toast.loading(message, {
      description: options?.description,
      duration: options?.duration
    });
  }, []);

  const dismiss = useCallback((toastId?: string | number) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  }, []);

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    dismiss
  };
};
