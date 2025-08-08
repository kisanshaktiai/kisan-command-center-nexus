
import { useState, useMemo, useCallback } from 'react';
import { Tenant } from '@/types/tenant';
import { UpdateTenantDTO } from '@/data/types/tenant';
import { useTenantData } from './useTenantData';
import { useTenantMutations } from './useTenantMutations';
import { useTenantFiltering } from './useTenantFiltering';
import { useTenantUIState } from './useTenantUIState';
import { useModalManager } from '@/hooks/useModalManager';
import { TenantDisplayService } from '@/services/TenantDisplayService';

const MODAL_IDS = {
  TENANT_DETAILS: 'tenant-details'
} as const;

export const useTenantPageState = () => {
  // Data hooks
  const { tenants, isLoading, error } = useTenantData();
  const { createTenantMutation, updateTenantMutation, deleteTenantMutation, isSubmitting } = useTenantMutations();
  
  // UI state hooks
  const { 
    creationSuccess,
    handleCreateSuccess,
    clearCreationSuccess 
  } = useTenantUIState();
  
  // Modal management
  const modalManager = useModalManager<Tenant>();
  
  // Filtering hooks
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
  } = useTenantFiltering({ tenants });

  // Format tenants for display (memoized for performance)
  const formattedTenants = useMemo(() => {
    return TenantDisplayService.formatTenantsForDisplay(filteredTenants);
  }, [filteredTenants]);

  // Get current modal state and formatted data
  const detailsTenant = modalManager.getModalData<Tenant>(MODAL_IDS.TENANT_DETAILS);
  const isDetailsModalOpen = modalManager.isModalOpen(MODAL_IDS.TENANT_DETAILS);
  const detailsFormattedData = useMemo(() => {
    return detailsTenant ? TenantDisplayService.formatTenantForDisplay(detailsTenant) : null;
  }, [detailsTenant]);

  // Action handlers
  const handleCreateTenant = useCallback(async (data: any): Promise<boolean> => {
    try {
      await createTenantMutation.mutateAsync(data);
      handleCreateSuccess({
        tenantName: data.name,
        adminEmail: data.owner_email,
        hasEmailSent: true
      });
      return true;
    } catch {
      return false;
    }
  }, [createTenantMutation, handleCreateSuccess]);

  const handleUpdateTenant = useCallback(async (id: string, data: UpdateTenantDTO): Promise<boolean> => {
    try {
      await updateTenantMutation.mutateAsync({ id, data });
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
    modalManager.openModal(MODAL_IDS.TENANT_DETAILS, tenant);
  }, [modalManager]);

  const closeDetailsModal = useCallback(() => {
    modalManager.closeModal(MODAL_IDS.TENANT_DETAILS);
  }, [modalManager]);

  const handleEdit = useCallback((tenant: Tenant) => {
    const updateData: UpdateTenantDTO = {
      name: tenant.name,
      status: tenant.status as any,
      subscription_plan: tenant.subscription_plan,
      owner_phone: tenant.owner_phone,
      business_registration: tenant.business_registration,
      business_address: tenant.business_address,
      established_date: tenant.established_date,
      subscription_start_date: tenant.subscription_start_date,
      subscription_end_date: tenant.subscription_end_date,
      trial_ends_at: tenant.trial_ends_at,
      max_farmers: tenant.max_farmers,
      max_dealers: tenant.max_dealers,
      max_products: tenant.max_products,
      max_storage_gb: tenant.max_storage_gb,
      max_api_calls_per_day: tenant.max_api_calls_per_day,
      subdomain: tenant.subdomain,
      custom_domain: tenant.custom_domain,
      metadata: tenant.metadata,
    };
    handleUpdateTenant(tenant.id, updateData);
  }, [handleUpdateTenant]);

  const handleDetailsEdit = useCallback((tenant: Tenant) => {
    closeDetailsModal();
    handleEdit(tenant);
  }, [closeDetailsModal, handleEdit]);

  return {
    // Data
    tenants: filteredTenants,
    formattedTenants,
    isLoading,
    error,
    isSubmitting,

    // UI State
    creationSuccess,
    clearCreationSuccess,

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

    // Modal state
    detailsTenant,
    isDetailsModalOpen,
    detailsFormattedData,

    // Actions
    handleCreateTenant,
    handleUpdateTenant,
    handleDeleteTenant,
    handleViewDetails,
    handleEdit,
    handleDetailsEdit,
    closeDetailsModal,
  };
};
