
import { useState, useMemo } from 'react';
import { Tenant } from '@/types/tenant';
import { TenantViewPreferences } from '@/types/tenantView';

interface UseTenantFiltersOptions {
  tenants: Tenant[];
  initialSearch?: string;
  initialType?: string;
  initialStatus?: string;
}

export const useTenantFilters = (options: UseTenantFiltersOptions) => {
  const { tenants, initialSearch = '', initialType = 'all', initialStatus = 'all' } = options;
  
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [filterType, setFilterType] = useState(initialType);
  const [filterStatus, setFilterStatus] = useState(initialStatus);
  const [viewPreferences, setViewPreferences] = useState<TenantViewPreferences>({
    mode: 'small-cards',
    density: 'comfortable',
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  const filteredTenants = useMemo(() => {
    let filtered = [...tenants];

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(tenant =>
        tenant.name.toLowerCase().includes(search) ||
        tenant.slug.toLowerCase().includes(search) ||
        tenant.owner_email?.toLowerCase().includes(search)
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(tenant => tenant.type === filterType);
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(tenant => tenant.status === filterStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const { sortBy, sortOrder } = viewPreferences;
      let aValue: any = a[sortBy as keyof Tenant];
      let bValue: any = b[sortBy as keyof Tenant];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [tenants, searchTerm, filterType, filterStatus, viewPreferences]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterStatus('all');
  };

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
    clearFilters,
  };
};
