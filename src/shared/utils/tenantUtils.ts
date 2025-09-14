
import { Tenant } from '@/types/tenant';
import { TenantViewPreferences } from '@/types/tenantView';

interface TenantFilters {
  searchTerm: string;
  filterType: string;
  filterStatus: string;
}

export const tenantOperations = {
  filterAndSort: (
    tenants: Tenant[],
    filters: TenantFilters,
    viewPreferences: TenantViewPreferences
  ): Tenant[] => {
    let filtered = tenants;

    // Apply search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(tenant =>
        tenant.name.toLowerCase().includes(searchLower) ||
        tenant.slug.toLowerCase().includes(searchLower) ||
        tenant.owner_email?.toLowerCase().includes(searchLower)
      );
    }

    // Apply type filter
    if (filters.filterType && filters.filterType !== 'all') {
      filtered = filtered.filter(tenant => tenant.type === filters.filterType);
    }

    // Apply status filter
    if (filters.filterStatus && filters.filterStatus !== 'all') {
      filtered = filtered.filter(tenant => tenant.status === filters.filterStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[viewPreferences.sortBy as keyof Tenant] || '';
      const bValue = b[viewPreferences.sortBy as keyof Tenant] || '';
      
      const comparison = String(aValue).localeCompare(String(bValue));
      return viewPreferences.sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }
};
