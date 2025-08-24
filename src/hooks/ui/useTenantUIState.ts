
import { useState, useCallback } from 'react';
import { Tenant } from '@/types/tenant';
import { TenantViewPreferences } from '@/types/tenantView';

/**
 * Pure UI State Hook - No Business Logic
 * Handles only UI state management for tenant components
 */
export const useTenantUIState = () => {
  // View preferences
  const [viewPreferences, setViewPreferences] = useState<TenantViewPreferences>({
    mode: 'small-cards',
    density: 'comfortable',
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal states
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Success/error UI states
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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

  const openCreateModal = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
  }, []);

  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setFilterType('all');
    setFilterStatus('all');
  }, []);

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
    clearFilters,

    // Modal state
    selectedTenant,
    isDetailsModalOpen,
    isEditModalOpen,
    isCreateModalOpen,

    // Success/error UI
    showSuccessMessage,
    successMessage,

    // Actions (UI only)
    openDetailsModal,
    closeDetailsModal,
    openEditModal,
    closeEditModal,
    openCreateModal,
    closeCreateModal,
    showSuccess,
  };
};
