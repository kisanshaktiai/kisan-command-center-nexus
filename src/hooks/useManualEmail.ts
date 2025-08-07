
import { useState } from 'react';
import { manualEmailService, ManualEmailRequest } from '@/services/ManualEmailService';
import { useNotifications } from './useNotifications';

export const useManualEmail = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useNotifications();

  const sendPasswordReset = async (request: ManualEmailRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await manualEmailService.sendPasswordReset(request);
      
      if (result.success) {
        showSuccess('Password reset email sent successfully');
        return true;
      } else {
        setError(result.error || 'Failed to send password reset email');
        showError(result.error || 'Failed to send password reset email');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send password reset email';
      setError(errorMessage);
      showError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resendWelcomeEmail = async (request: ManualEmailRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await manualEmailService.resendWelcomeEmail(request);
      
      if (result.success) {
        showSuccess('Welcome email sent successfully');
        return true;
      } else {
        setError(result.error || 'Failed to send welcome email');
        showError(result.error || 'Failed to send welcome email');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send welcome email';
      setError(errorMessage);
      showError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    loading,
    error,
    sendPasswordReset,
    resendWelcomeEmail,
    clearError
  };
};
