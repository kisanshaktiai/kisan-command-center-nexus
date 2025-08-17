
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TenantAccessResult {
  hasAccess: boolean;
  relationship: any | null;
  isAutoCreated: boolean;
  message: string;
}

export const useTenantAccessValidation = () => {
  const [isValidating, setIsValidating] = useState(false);

  const validateTenantAccess = useCallback(async (tenantId: string): Promise<TenantAccessResult | null> => {
    if (!tenantId) {
      return null;
    }

    setIsValidating(true);
    try {
      console.log('Validating tenant access for:', tenantId);

      const { data, error } = await supabase.functions.invoke('ensure-tenant-access', {
        body: { tenantId }
      });

      if (error) {
        console.error('Error validating tenant access:', error);
        toast.error('Failed to validate tenant access');
        return null;
      }

      if (data?.success) {
        if (data.isAutoCreated) {
          toast.success('Tenant access granted - relationship created automatically');
        }
        
        console.log('Tenant access validation result:', data);
        return {
          hasAccess: data.hasAccess,
          relationship: data.relationship,
          isAutoCreated: data.isAutoCreated,
          message: data.message
        };
      }

      return null;
    } catch (error) {
      console.error('Unexpected error validating tenant access:', error);
      toast.error('Unexpected error validating tenant access');
      return null;
    } finally {
      setIsValidating(false);
    }
  }, []);

  return {
    validateTenantAccess,
    isValidating
  };
};
