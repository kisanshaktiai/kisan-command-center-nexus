
import { useState, useEffect } from 'react';
import { securityService } from '@/services/SecurityService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TenantSecurityState {
  isValidated: boolean;
  isLoading: boolean;
  error: string | null;
  hasAccess: boolean;
  userRole?: string;
}

export const useTenantSecurity = (tenantId?: string, requiredRole?: string) => {
  const { user } = useAuth();
  const [state, setState] = useState<TenantSecurityState>({
    isValidated: false,
    isLoading: true,
    error: null,
    hasAccess: false
  });

  useEffect(() => {
    const validateAccess = async () => {
      if (!user) {
        setState({
          isValidated: true,
          isLoading: false,
          error: 'Authentication required',
          hasAccess: false
        });
        return;
      }

      setState(prev => ({ ...prev, isLoading: true }));

      try {
        const validation = await securityService.validateApiAccess(tenantId, requiredRole);
        
        setState({
          isValidated: true,
          isLoading: false,
          error: validation.error || null,
          hasAccess: validation.isValid,
          userRole: requiredRole
        });

        if (!validation.isValid && validation.error) {
          toast.error(`Access denied: ${validation.error}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Validation failed';
        setState({
          isValidated: true,
          isLoading: false,
          error: errorMessage,
          hasAccess: false
        });
        toast.error(errorMessage);
      }
    };

    validateAccess();
  }, [user, tenantId, requiredRole]);

  return state;
};
