
import { useState } from 'react';
import { TenantViewPreferences } from '@/types/tenantView';
import { useTenantData } from './useTenantData';

interface UseTenantPageStateOptions {
  initialFilters?: {
    search?: string;
    type?: string;
    status?: string;
  };
}

export const useTenantPageState = (options: UseTenantPageStateOptions = {}) => {
  const { data: tenants = [], isLoading, error } = useTenantData({ filters: options.initialFilters });
  
  const [viewPreferences, setViewPreferences] = useState<TenantViewPreferences>({
    mode: 'small-cards',
    density: 'comfortable',
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  const [searchTerm, setSearchTerm] = useState(options.initialFilters?.search || '');
  const [filterType, setFilterType] = useState(options.initialFilters?.type || '');
  const [filterStatus, setFilterStatus] = useState(options.initialFilters?.status || '');

  return {
    tenants,
    isLoading,
    error,
    viewPreferences,
    setViewPreferences,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
  };
};
