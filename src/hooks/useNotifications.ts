
import { toast } from 'sonner';

interface NotificationOptions {
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const useNotifications = () => {
  const showSuccess = (message: string, options?: NotificationOptions) => {
    if (options?.description) {
      toast.success(message, { description: options.description });
    } else {
      toast.success(message);
    }
  };

  const showError = (message: string, options?: NotificationOptions) => {
    if (options?.description) {
      toast.error(message, { description: options.description });
    } else {
      toast.error(message);
    }
  };

  const showInfo = (message: string, options?: NotificationOptions) => {
    if (options?.description) {
      toast.info(message, { description: options.description });
    } else {
      toast.info(message);
    }
  };

  const showWarning = (message: string, options?: NotificationOptions) => {
    if (options?.description) {
      toast.warning(message, { description: options.description });
    } else {
      toast.warning(message);
    }
  };

  const showLoading = (message: string) => {
    return toast.loading(message);
  };

  const dismiss = (toastId?: string | number) => {
    toast.dismiss(toastId);
  };

  return {
    showSuccess,
    showError,
    showInfo,
    showWarning,
    showLoading,
    dismiss
  };
};
