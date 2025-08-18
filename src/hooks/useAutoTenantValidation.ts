
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AutoTenantValidationResult {
  hasAccess: boolean;
  relationship: any | null;
  isAutoCreated: boolean;
  message: string;
  tenant: {
    id: string;
    name: string;
  };
}

export const useAutoTenantValidation = () => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<Record<string, AutoTenantValidationResult>>({});

  const validateTenantAccess = useCallback(async (tenantId: string): Promise<AutoTenantValidationResult | null> => {
    if (!tenantId) {
      return null;
    }

    // Return cached result if available
    if (validationResults[tenantId]) {
      return validationResults[tenantId];
    }

    setIsValidating(true);
    
    try {
      console.log('Auto-validating tenant access for:', tenantId);

      const { data, error } = await supabase.functions.invoke('ensure-tenant-access', {
        body: { tenantId }
      });

      if (error) {
        console.error('Error in auto-validation:', error);
        toast.error('Failed to validate tenant access');
        return null;
      }

      if (data?.success) {
        const result: AutoTenantValidationResult = {
          hasAccess: data.hasAccess,
          relationship: data.relationship,
          isAutoCreated: data.isAutoCreated,
          message: data.message,
          tenant: data.tenant
        };

        // Cache the result
        setValidationResults(prev => ({
          ...prev,
          [tenantId]: result
        }));

        if (data.isAutoCreated) {
          toast.success('Tenant access granted - connection established automatically');
        }
        
        console.log('Auto-validation result:', result);
        return result;
      }

      return null;
    } catch (error) {
      console.error('Unexpected error in auto-validation:', error);
      toast.error('Unexpected error during tenant validation');
      return null;
    } finally {
      setIsValidating(false);
    }
  }, [validationResults]);

  const clearValidationCache = useCallback((tenantId?: string) => {
    if (tenantId) {
      setValidationResults(prev => {
        const { [tenantId]: removed, ...rest } = prev;
        return rest;
      });
    } else {
      setValidationResults({});
    }
  }, []);

  return {
    validateTenantAccess,
    isValidating,
    validationResults,
    clearValidationCache
  };
};
