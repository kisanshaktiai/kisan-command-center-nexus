
import { useState, useMemo } from 'react';
import { TenantDTO } from '@/data/types/tenant';
import { TenantViewPreferences } from '@/types/tenantView';
import { tenantOperations } from '@/shared/utils/tenantUtils';

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

  // Filter and sort tenants using shared utilities
  const filteredAndSortedTenants = useMemo(() => {
    return tenantOperations.filterAndSort(
      tenants,
      { searchTerm, filterType, filterStatus },
      viewPreferences
    );
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
