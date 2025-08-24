
import { useState } from 'react';
import { Tenant } from '@/types/tenant';

interface CreationSuccessState {
  tenantName: string;
  adminEmail: string;
  hasEmailSent: boolean;
  correlationId?: string;
  warnings?: string[];
}

export const useTenantModals = () => {
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [creationSuccess, setCreationSuccess] = useState<CreationSuccessState | null>(null);

  const openDetailsModal = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsDetailsModalOpen(true);
  };

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedTenant(null);
  };

  const openEditModal = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedTenant(null);
  };

  const handleDetailsEdit = (tenant: Tenant) => {
    closeDetailsModal();
    openEditModal(tenant);
  };

  const clearCreationSuccess = () => {
    setCreationSuccess(null);
  };

  return {
    selectedTenant,
    isDetailsModalOpen,
    isEditModalOpen,
    creationSuccess,
    openDetailsModal,
    closeDetailsModal,
    openEditModal,
    closeEditModal,
    handleDetailsEdit,
    setCreationSuccess,
    clearCreationSuccess,
  };
};
