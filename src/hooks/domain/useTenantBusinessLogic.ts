
import { useCallback } from 'react';
import { useUnifiedTenant } from '@/contexts/UnifiedTenantProvider';
import { tenantManagementService } from '@/features/tenant/services/TenantManagementService';
import { CreateTenantDTO, UpdateTenantDTO } from '@/types/tenant';

interface TenantBusinessResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export const useTenantBusinessLogic = () => {
  const { tenant, refreshTenant } = useUnifiedTenant();

  const createTenant = useCallback(async (data: CreateTenantDTO): Promise<TenantBusinessResult> => {
    try {
      const result = await tenantManagementService.createTenant(data);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true, data: result.data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create tenant'
      };
    }
  }, []);

  const updateTenant = useCallback(async (id: string, data: UpdateTenantDTO): Promise<TenantBusinessResult> => {
    try {
      const result = await tenantManagementService.updateTenant(id, data);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Refresh current tenant if it was updated
      if (tenant?.id === id) {
        await refreshTenant();
      }

      return { success: true, data: result.data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update tenant'
      };
    }
  }, [tenant?.id, refreshTenant]);

  const suspendTenant = useCallback(async (id: string, reason?: string): Promise<TenantBusinessResult> => {
    try {
      const result = await tenantManagementService.suspendTenant(id, reason);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to suspend tenant'
      };
    }
  }, []);

  const reactivateTenant = useCallback(async (id: string): Promise<TenantBusinessResult> => {
    try {
      const result = await tenantManagementService.reactivateTenant(id);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reactivate tenant'
      };
    }
  }, []);

  return {
    createTenant,
    updateTenant,
    suspendTenant,
    reactivateTenant,
  };
};
