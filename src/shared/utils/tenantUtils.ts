
import { TenantDTO } from '@/data/types/tenant';
import { TenantViewPreferences } from '@/types/tenantView';

export const tenantFilters = {
  bySearch: (tenants: TenantDTO[], searchTerm: string) => {
    if (!searchTerm) return tenants;
    const term = searchTerm.toLowerCase();
    return tenants.filter((tenant) => 
      tenant.name.toLowerCase().includes(term) ||
      tenant.slug.toLowerCase().includes(term)
    );
  },

  byType: (tenants: TenantDTO[], filterType: string) => {
    if (filterType === 'all') return tenants;
    return tenants.filter((tenant) => tenant.type === filterType);
  },

  byStatus: (tenants: TenantDTO[], filterStatus: string) => {
    if (filterStatus === 'all') return tenants;
    return tenants.filter((tenant) => tenant.status === filterStatus);
  },

  applyAll: (tenants: TenantDTO[], filters: {
    searchTerm: string;
    filterType: string;
    filterStatus: string;
  }) => {
    let filtered = tenants;
    filtered = tenantFilters.bySearch(filtered, filters.searchTerm);
    filtered = tenantFilters.byType(filtered, filters.filterType);
    filtered = tenantFilters.byStatus(filtered, filters.filterStatus);
    return filtered;
  }
};

export const tenantSorters = {
  byField: (tenants: TenantDTO[], sortBy: string, sortOrder: 'asc' | 'desc') => {
    return [...tenants].sort((a, b) => {
      let aValue = a[sortBy as keyof TenantDTO] as string;
      let bValue = b[sortBy as keyof TenantDTO] as string;
      
      if (sortBy === 'created_at') {
        aValue = new Date(aValue).getTime().toString();
        bValue = new Date(bValue).getTime().toString();
      }
      
      const comparison = aValue?.localeCompare(bValue) || 0;
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }
};

export const tenantOperations = {
  filterAndSort: (
    tenants: TenantDTO[], 
    filters: {
      searchTerm: string;
      filterType: string;
      filterStatus: string;
    },
    viewPreferences: TenantViewPreferences
  ) => {
    const filtered = tenantFilters.applyAll(tenants, filters);
    return tenantSorters.byField(filtered, viewPreferences.sortBy, viewPreferences.sortOrder);
  }
};
