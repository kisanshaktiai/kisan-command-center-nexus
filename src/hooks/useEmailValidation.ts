import { useState, useEffect } from 'react';
import { useDebounce } from './useDebounce';
import { supabase } from '@/integrations/supabase/client';

interface ValidationResult {
  isValid: boolean;
  exists: boolean;
  userId?: string;
  issues: string[];
  existingRoles: {
    isAdmin: boolean;
    isTenantUser: boolean;
    tenantIds: string[];
  };
  pendingInvites: {
    hasAdminInvite: boolean;
    hasUserInvite: boolean;
    tenantIds: string[];
  };
  normalizedEmail: string;
}

interface UseEmailValidationOptions {
  email: string;
  tenantId?: string;
  invitationType: 'admin' | 'user';
  role: string;
  enabled?: boolean;
}

interface UseEmailValidationReturn {
  isChecking: boolean;
  isValid: boolean | null;
  issues: string[];
  validationData: ValidationResult | null;
  error: string | null;
}

export function useEmailValidation({
  email,
  tenantId,
  invitationType,
  role,
  enabled = true
}: UseEmailValidationOptions): UseEmailValidationReturn {
  const [isChecking, setIsChecking] = useState(false);
  const [validationData, setValidationData] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debounce the email input to prevent excessive API calls
  const debouncedEmail = useDebounce(email, 500);

  useEffect(() => {
    // Reset state when email is empty or validation is disabled
    if (!enabled || !debouncedEmail || debouncedEmail.trim().length === 0) {
      setValidationData(null);
      setError(null);
      setIsChecking(false);
      return;
    }

    // Don't validate if email doesn't look like an email at all
    if (!debouncedEmail.includes('@')) {
      setValidationData(null);
      setError(null);
      setIsChecking(false);
      return;
    }

    const validateEmail = async () => {
      setIsChecking(true);
      setError(null);

      try {
        const { data, error: functionError } = await supabase.functions.invoke(
          'validate-user-invitation',
          {
            body: {
              email: debouncedEmail,
              tenantId,
              invitationType,
              role
            }
          }
        );

        if (functionError) {
          console.error('[useEmailValidation] Function error:', functionError);
          setError('Failed to validate email. Please try again.');
          setValidationData(null);
        } else {
          setValidationData(data as ValidationResult);
          setError(null);
        }
      } catch (err: any) {
        console.error('[useEmailValidation] Validation error:', err);
        setError('An unexpected error occurred during validation');
        setValidationData(null);
      } finally {
        setIsChecking(false);
      }
    };

    validateEmail();
  }, [debouncedEmail, tenantId, invitationType, role, enabled]);

  return {
    isChecking,
    isValid: validationData?.isValid ?? null,
    issues: validationData?.issues ?? [],
    validationData,
    error
  };
}
