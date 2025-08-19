
import { useState, useMemo } from 'react';
import { Tenant } from '@/types/tenant';
import { TenantViewPreferences } from '@/types/tenantView';

interface UseTenantFilteringOptions {
  tenants: Tenant[];
  initialFilters?: {
    search?: string;
    type?: string;
    status?: string;
  };
  initialViewPreferences?: TenantViewPreferences;
}

export const useTenantFiltering = (options: UseTenantFilteringOptions) => {
  const { tenants, initialFilters = {}, initialViewPreferences } = options;

  const [searchTerm, setSearchTerm] = useState(initialFilters.search || '');
  const [filterType, setFilterType] = useState(initialFilters.type || '');
  const [filterStatus, setFilterStatus] = useState(initialFilters.status || '');
  const [viewPreferences, setViewPreferences] = useState<TenantViewPreferences>(
    initialViewPreferences || {
      mode: 'small-cards',
      density: 'comfortable',
      sortBy: 'created_at',
      sortOrder: 'desc',
    }
  );

  const filteredTenants = useMemo(() => {
    let filtered = [...tenants];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(tenant => 
        tenant.name.toLowerCase().includes(searchLower) ||
        tenant.owner_email?.toLowerCase().includes(searchLower) ||
        tenant.slug.toLowerCase().includes(searchLower)
      );
    }

    // Apply type filter
    if (filterType && filterType !== 'all') {
      filtered = filtered.filter(tenant => tenant.type === filterType);
    }

    // Apply status filter
    if (filterStatus && filterStatus !== 'all') {
      filtered = filtered.filter(tenant => tenant.status === filterStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const { sortBy, sortOrder } = viewPreferences;
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [tenants, searchTerm, filterType, filterStatus, viewPreferences]);

  return {
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    viewPreferences,
    setViewPreferences,
    filteredTenants,
  };
};
