
import { useState, useCallback } from 'react';
import { Tenant } from '@/types/tenant';
import { tenantDataTransformationService } from '@/services/TenantDataTransformationService';

interface CreationSuccessState {
  tenantName: string;
  adminEmail: string;
  hasEmailSent: boolean;
  correlationId?: string;
  warnings?: string[];
}

/**
 * Focused hook for tenant modal management
 * Handles: Modal states, selected tenant, success states
 */
export const useTenantModals = () => {
  // Modal states
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [creationSuccess, setCreationSuccess] = useState<CreationSuccessState | null>(null);

  // Computed values
  const detailsFormattedData = selectedTenant 
    ? tenantDataTransformationService.formatTenantForDisplay(selectedTenant)
    : null;

  // Modal actions
  const openDetailsModal = useCallback((tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsDetailsModalOpen(true);
  }, []);

  const closeDetailsModal = useCallback(() => {
    setIsDetailsModalOpen(false);
    setSelectedTenant(null);
  }, []);

  const openEditModal = useCallback((tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsEditModalOpen(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setSelectedTenant(null);
  }, []);

  const handleDetailsEdit = useCallback((tenant: Tenant) => {
    closeDetailsModal();
    openEditModal(tenant);
  }, [closeDetailsModal, openEditModal]);

  const clearCreationSuccess = useCallback(() => {
    setCreationSuccess(null);
  }, []);

  return {
    // State
    selectedTenant,
    isDetailsModalOpen,
    isEditModalOpen,
    creationSuccess,
    detailsFormattedData,

    // Actions
    openDetailsModal,
    closeDetailsModal,
    openEditModal,
    closeEditModal,
    handleDetailsEdit,
    setCreationSuccess,
    clearCreationSuccess,
  };
};
