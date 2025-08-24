
import { useState } from 'react';
import { Tenant } from '@/types/tenant';
import { TenantViewPreferences } from '@/types/tenantView';

export const useTenantUI = () => {
  // View preferences state
  const [viewPreferences, setViewPreferences] = useState<TenantViewPreferences>({
    mode: 'small-cards',
    density: 'comfortable',
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modal states
  const [detailsTenant, setDetailsTenant] = useState<Tenant | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Modal actions
  const openDetailsModal = (tenant: Tenant) => {
    console.log('useTenantUI: Opening details for tenant:', tenant.id);
    setDetailsTenant(tenant);
    setIsDetailsModalOpen(true);
  };

  const closeDetailsModal = () => {
    console.log('useTenantUI: Closing details modal');
    setIsDetailsModalOpen(false);
    setDetailsTenant(null);
  };

  const openEditModal = (tenant: Tenant) => {
    console.log('useTenantUI: Opening edit for tenant:', tenant.id);
    setEditingTenant(tenant);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    console.log('useTenantUI: Closing edit modal');
    setIsEditModalOpen(false);
    setEditingTenant(null);
  };

  const handleDetailsEdit = (tenant: Tenant) => {
    console.log('useTenantUI: Edit from details for tenant:', tenant.id);
    closeDetailsModal();
    openEditModal(tenant);
  };

  return {
    // View preferences
    viewPreferences,
    setViewPreferences,

    // Filters
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,

    // Modal state
    detailsTenant,
    isDetailsModalOpen,
    editingTenant,
    isEditModalOpen,

    // Modal actions
    openDetailsModal,
    closeDetailsModal,
    openEditModal,
    closeEditModal,
    handleDetailsEdit,
  };
};
