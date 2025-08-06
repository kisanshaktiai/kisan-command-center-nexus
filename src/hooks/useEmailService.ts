
import { useState } from 'react';
import { emailService } from '@/services/EmailService';
import type { 
  TenantWelcomeEmailData,
  LeadConversionEmailData,
  EmailVerificationData,
  EmailLog
} from '@/types/email';

export const useEmailService = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendTenantWelcomeEmail = async (data: TenantWelcomeEmailData) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await emailService.sendTenantWelcomeEmail(data);
      if (!result.success) {
        setError(result.error);
        return false;
      }
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send welcome email';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const sendLeadConversionEmail = async (data: LeadConversionEmailData) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await emailService.sendLeadConversionEmail(data);
      if (!result.success) {
        setError(result.error);
        return false;
      }
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send conversion email';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const sendEmailVerification = async (data: EmailVerificationData) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await emailService.sendEmailVerification(data);
      if (!result.success) {
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send verification email';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const verifyEmailToken = async (token: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await emailService.verifyEmailToken(token);
      if (!result.success) {
        setError(result.error);
        return null;
      }
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify email token';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getEmailLogs = async (tenantId?: string, limit = 50) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await emailService.getEmailLogs(tenantId, limit);
      if (!result.success) {
        setError(result.error);
        return [];
      }
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch email logs';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    sendTenantWelcomeEmail,
    sendLeadConversionEmail,
    sendEmailVerification,
    verifyEmailToken,
    getEmailLogs,
    setError
  };
};
