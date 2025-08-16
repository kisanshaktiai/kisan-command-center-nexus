
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminEmailValidationResult {
  valid: boolean;
  exists: boolean;
  error?: string;
  message?: string;
}

export const useAdminEmailValidation = () => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<AdminEmailValidationResult | null>(null);

  const validateAdminEmail = useCallback(async (email: string): Promise<AdminEmailValidationResult | null> => {
    if (!email?.trim()) {
      const result = { valid: false, exists: false, error: 'Email is required' };
      setValidationResult(result);
      return result;
    }

    // Basic client-side email validation
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      const result = { valid: false, exists: false, error: 'Invalid email format' };
      setValidationResult(result);
      return result;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      console.log('useAdminEmailValidation: Validating admin email:', email);
      
      const { data, error } = await supabase.functions.invoke('validate-admin-email', {
        body: { email: email.trim() }
      });

      if (error) {
        console.error('useAdminEmailValidation: Error calling validation function:', error);
        const result = { valid: false, exists: false, error: 'Failed to validate email' };
        setValidationResult(result);
        return result;
      }

      console.log('useAdminEmailValidation: Validation response:', data);

      const result: AdminEmailValidationResult = {
        valid: data?.valid || false,
        exists: data?.exists || false,
        error: data?.error,
        message: data?.message
      };

      setValidationResult(result);
      return result;
    } catch (error) {
      console.error('useAdminEmailValidation: Exception during validation:', error);
      const result = { 
        valid: false, 
        exists: false, 
        error: error instanceof Error ? error.message : 'Failed to validate email' 
      };
      setValidationResult(result);
      return result;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const clearValidation = useCallback(() => {
    setValidationResult(null);
  }, []);

  return {
    isValidating,
    validationResult,
    validateAdminEmail,
    clearValidation
  };
};
