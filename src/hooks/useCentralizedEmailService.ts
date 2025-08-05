
import { useState, useCallback } from 'react';
import { CentralizedEmailService, EmailRequest, CreateTenantUserRequest } from '@/services/CentralizedEmailService';
import { useNotifications } from './useNotifications';

export const useCentralizedEmailService = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError } = useNotifications();

  const sendEmail = useCallback(async (
    emailRequest: EmailRequest,
    showNotification = true
  ) => {
    setIsLoading(true);
    try {
      const result = await CentralizedEmailService.sendEmail(emailRequest);
      
      if (result.success) {
        if (showNotification) {
          showSuccess(`${emailRequest.type} email sent successfully to ${emailRequest.recipientEmail}`);
        }
        return result.data;
      } else {
        if (showNotification) {
          showError(result.error || 'Failed to send email');
        }
        return null;
      }
    } catch (error) {
      if (showNotification) {
        showError('Unexpected error while sending email');
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [showSuccess, showError]);

  const createTenantUser = useCallback(async (
    request: CreateTenantUserRequest,
    showNotification = true
  ) => {
    setIsLoading(true);
    try {
      const result = await CentralizedEmailService.createTenantUser(request);
      
      if (result.success) {
        if (showNotification) {
          showSuccess(`Tenant user created successfully for ${request.email}`);
        }
        return result.data;
      } else {
        if (showNotification) {
          showError(result.error || 'Failed to create tenant user');
        }
        return null;
      }
    } catch (error) {
      if (showNotification) {
        showError('Unexpected error while creating tenant user');
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [showSuccess, showError]);

  const sendLeadActivationEmail = useCallback(async (
    leadId: string,
    tenantId: string,
    email: string,
    fullName: string,
    showNotification = true
  ) => {
    setIsLoading(true);
    try {
      const result = await CentralizedEmailService.sendLeadActivationEmail(
        leadId,
        tenantId,
        email,
        fullName
      );
      
      if (result.success) {
        if (showNotification) {
          showSuccess(`Activation email sent successfully to ${email}`);
        }
        return result.data;
      } else {
        if (showNotification) {
          showError(result.error || 'Failed to send activation email');
        }
        return null;
      }
    } catch (error) {
      if (showNotification) {
        showError('Unexpected error while sending activation email');
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [showSuccess, showError]);

  const validateInvitationToken = useCallback(async (token: string) => {
    try {
      const result = await CentralizedEmailService.validateInvitationToken(token);
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Error validating invitation token:', error);
      return null;
    }
  }, []);

  const markInvitationClicked = useCallback(async (token: string) => {
    try {
      const result = await CentralizedEmailService.markInvitationClicked(token);
      return result.success && result.data;
    } catch (error) {
      console.error('Error marking invitation as clicked:', error);
      return false;
    }
  }, []);

  const markInvitationAccepted = useCallback(async (token: string) => {
    try {
      const result = await CentralizedEmailService.markInvitationAccepted(token);
      return result.success && result.data;
    } catch (error) {
      console.error('Error marking invitation as accepted:', error);
      return false;
    }
  }, []);

  return {
    isLoading,
    sendEmail,
    createTenantUser,
    sendLeadActivationEmail,
    validateInvitationToken,
    markInvitationClicked,
    markInvitationAccepted
  };
};

export default useCentralizedEmailService;
