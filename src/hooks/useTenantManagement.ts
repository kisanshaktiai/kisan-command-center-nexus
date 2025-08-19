
import { useCallback, useState } from 'react';
import { CreateTenantDTO, UpdateTenantDTO, Tenant } from '@/types/tenant';
import { TenantViewPreferences } from '@/types/tenantView';
import { useTenantData } from './useTenantData';
import { useTenantMutations } from './useTenantMutations';
import { useTenantFiltering } from './useTenantFiltering';
import { TenantDisplayService, FormattedTenantData } from '@/services/TenantDisplayService';
import { TenantStatus, SubscriptionPlan, TenantStatusValue, SubscriptionPlanValue } from '@/types/enums';

interface UseTenantManagementOptions {
  initialFilters?: {
    search?: string;
    type?: string;
    status?: string;
  };
  initialViewPreferences?: TenantViewPreferences;
}

interface CreationSuccessState {
  tenantName: string;
  adminEmail: string;
  hasEmailSent: boolean;
  correlationId?: string;
  warnings?: string[];
}

export const useTenantManagement = (options: UseTenantManagementOptions = {}) => {
  // Data and mutations
  const { data: tenantData = [], isLoading, error } = useTenantData({ filters: options.initialFilters });
  
  // Ensure we always work with an array
  const tenants = Array.isArray(tenantData) ? tenantData : [tenantData].filter(Boolean);
  
  const { createTenantMutation, updateTenantMutation, deleteTenantMutation, isSubmitting } = useTenantMutations();
  
  // Filtering and sorting
  const {
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    viewPreferences,
    setViewPreferences,
    filteredTenants,
  } = useTenantFiltering({ 
    tenants, 
    initialFilters: options.initialFilters,
    initialViewPreferences: options.initialViewPreferences
  });

  // Additional state for UI management
  const [creationSuccess, setCreationSuccess] = useState<CreationSuccessState | null>(null);
  const [detailsTenant, setDetailsTenant] = useState<Tenant | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Format tenants for display
  const formattedTenants: FormattedTenantData[] = TenantDisplayService.formatTenantsForDisplay(filteredTenants);
  
  // Format details tenant for display
  const detailsFormattedData = detailsTenant ? TenantDisplayService.formatTenantForDisplay(detailsTenant) : null;

  // Success state management
  const clearCreationSuccess = useCallback(() => {
    setCreationSuccess(null);
  }, []);

  // Action handlers
  const handleCreateTenant = useCallback(async (data: CreateTenantDTO): Promise<boolean> => {
    try {
      const result = await createTenantMutation.mutateAsync(data);
      if (result) {
        setCreationSuccess({
          tenantName: data.name,
          adminEmail: data.owner_email || '',
          hasEmailSent: true,
          correlationId: `create-${Date.now()}`
        });
      }
      return true;
    } catch {
      return false;
    }
  }, [createTenantMutation]);

  const handleUpdateTenant = useCallback(async (id: string, data: UpdateTenantDTO): Promise<boolean> => {
    try {
      // Ensure proper type conversion
      const updateData: UpdateTenantDTO = {
        ...data,
        status: data.status as TenantStatusValue,
        subscription_plan: data.subscription_plan as SubscriptionPlanValue,
        metadata: {
          ...data.metadata,
          updated_via: 'tenant_management_hook',
          security_context: {
            user_id: 'current_user',
            timestamp: new Date().toISOString(),
            source: 'web_interface'
          },
          last_updated: new Date().toISOString()
        }
      };

      await updateTenantMutation.mutateAsync({ id, data: updateData });
      return true;
    } catch {
      return false;
    }
  }, [updateTenantMutation]);

  const handleDeleteTenant = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteTenantMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  }, [deleteTenantMutation]);

  const handleViewDetails = useCallback((tenant: Tenant) => {
    setDetailsTenant(tenant);
    setIsDetailsModalOpen(true);
  }, []);

  const handleDetailsEdit = useCallback(() => {
    // This would typically open an edit modal or navigate to edit page
    console.log('Edit tenant details');
  }, []);

  const closeDetailsModal = useCallback(() => {
    setIsDetailsModalOpen(false);
    setDetailsTenant(null);
  }, []);

  return {
    // Data
    tenants: filteredTenants,
    formattedTenants,
    isLoading,
    error,
    isSubmitting,

    // Success state
    creationSuccess,
    clearCreationSuccess,

    // Details modal
    detailsTenant,
    isDetailsModalOpen,
    detailsFormattedData,

    // Filters
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,

    // View preferences
    viewPreferences,
    setViewPreferences,

    // Actions
    handleCreateTenant,
    handleUpdateTenant,
    handleDeleteTenant,
    handleViewDetails,
    handleDetailsEdit,
    closeDetailsModal,

    // Mutations for direct access if needed
    createTenantMutation,
    updateTenantMutation,
    deleteTenantMutation,
  };
};
