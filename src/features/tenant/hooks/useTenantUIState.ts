
import { useState } from 'react';
import { Tenant } from '@/types/tenant';

export const useTenantUIState = () => {
  // Modal states
  const [detailsTenant, setDetailsTenant] = useState<Tenant | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [creationSuccess, setCreationSuccess] = useState<any>(null);

  // Modal actions
  const handleViewDetails = (tenant: Tenant) => {
    setDetailsTenant(tenant);
    setIsDetailsModalOpen(true);
  };

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setDetailsTenant(null);
  };

  const handleCreateSuccess = (result: any) => {
    setCreationSuccess(result);
  };

  const clearCreationSuccess = () => {
    setCreationSuccess(null);
  };

  return {
    // State
    detailsTenant,
    isDetailsModalOpen,
    creationSuccess,
    
    // Actions
    handleViewDetails,
    closeDetailsModal,
    handleCreateSuccess,
    clearCreationSuccess,
    setDetailsTenant,
    setIsDetailsModalOpen,
    setCreationSuccess,
  };
};
