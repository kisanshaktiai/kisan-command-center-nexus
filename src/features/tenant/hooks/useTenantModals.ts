
import { useState, useCallback } from 'react';
import { Tenant, UpdateTenantDTO } from '@/types/tenant';

export const useTenantModals = () => {
  // Details modal state
  const [detailsTenant, setDetailsTenant] = useState<Tenant | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  // Edit modal state
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Details modal actions
  const handleViewDetails = useCallback((tenant: Tenant) => {
    console.log('Opening details for tenant:', tenant.id);
    setDetailsTenant(tenant);
    setIsDetailsModalOpen(true);
  }, []);

  const closeDetailsModal = useCallback(() => {
    console.log('Closing details modal');
    setIsDetailsModalOpen(false);
    setDetailsTenant(null);
  }, []);

  const handleDetailsEdit = useCallback((tenant: Tenant) => {
    console.log('Edit from details for tenant:', tenant.id);
    // Close details modal and open edit modal
    setIsDetailsModalOpen(false);
    setDetailsTenant(null);
    setEditingTenant(tenant);
    setIsEditModalOpen(true);
  }, []);

  // Edit modal actions
  const handleEditTenant = useCallback((tenant: Tenant) => {
    console.log('Direct edit for tenant:', tenant.id);
    setEditingTenant(tenant);
    setIsEditModalOpen(true);
  }, []);

  const closeEditModal = useCallback(() => {
    console.log('Closing edit modal');
    setIsEditModalOpen(false);
    setEditingTenant(null);
  }, []);

  return {
    // Details modal
    detailsTenant,
    isDetailsModalOpen,
    handleViewDetails,
    closeDetailsModal,
    handleDetailsEdit,

    // Edit modal
    editingTenant,
    isEditModalOpen,
    handleEditTenant,
    closeEditModal,
  };
};
