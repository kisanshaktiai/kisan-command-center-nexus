
import { useState, useMemo } from 'react';
import { TenantDTO } from '@/data/types/tenant';
import { TenantViewPreferences } from '@/types/tenantView';

interface UseTenantFilteringOptions {
  tenants: TenantDTO[];
  initialFilters?: {
    search?: string;
    type?: string;
    status?: string;
  };
  initialViewPreferences?: TenantViewPreferences;
}

export const useTenantFiltering = ({
  tenants,
  initialFilters = {},
  initialViewPreferences = {
    mode: 'small-cards',
    density: 'comfortable',
    sortBy: 'created_at',
    sortOrder: 'desc'
  }
}: UseTenantFilteringOptions) => {
  // Filter state
  const [searchTerm, setSearchTerm] = useState(initialFilters.search || '');
  const [filterType, setFilterType] = useState(initialFilters.type || 'all');
  const [filterStatus, setFilterStatus] = useState(initialFilters.status || 'all');
  
  // View preferences state
  const [viewPreferences, setViewPreferences] = useState<TenantViewPreferences>(
    initialViewPreferences
  );

  // Filter and sort tenants
  const filteredAndSortedTenants = useMemo(() => {
    let filtered = tenants.filter((tenant: TenantDTO) => {
      const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           tenant.slug.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || tenant.type === filterType;
      const matchesStatus = filterStatus === 'all' || tenant.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });

    // Sort
    const { sortBy, sortOrder } = viewPreferences;
    filtered = [...filtered].sort((a, b) => {
      let aValue = a[sortBy as keyof TenantDTO] as string;
      let bValue = b[sortBy as keyof TenantDTO] as string;
      
      if (sortBy === 'created_at') {
        aValue = new Date(aValue).getTime().toString();
        bValue = new Date(bValue).getTime().toString();
      }
      
      const comparison = aValue?.localeCompare(bValue) || 0;
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [tenants, searchTerm, filterType, filterStatus, viewPreferences]);

  return {
    // Filter state
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    
    // View preferences
    viewPreferences,
    setViewPreferences,
    
    // Computed data
    filteredTenants: filteredAndSortedTenants,
  };
};
