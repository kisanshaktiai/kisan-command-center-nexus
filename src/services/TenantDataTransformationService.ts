
import { Tenant } from '@/types/tenant';
import { TenantDisplayService, FormattedTenantData } from '@/services/TenantDisplayService';
import { TenantViewPreferences } from '@/types/tenantView';

/**
 * Centralized Data Transformation Service
 * Handles all tenant data transformations in one place
 */
export class TenantDataTransformationService {
  private static instance: TenantDataTransformationService;

  public static getInstance(): TenantDataTransformationService {
    if (!TenantDataTransformationService.instance) {
      TenantDataTransformationService.instance = new TenantDataTransformationService();
    }
    return TenantDataTransformationService.instance;
  }

  /**
   * Transform tenants for display
   */
  formatTenantsForDisplay(tenants: Tenant[]): FormattedTenantData[] {
    return TenantDisplayService.formatTenantsForDisplay(tenants);
  }

  /**
   * Transform single tenant for display
   */
  formatTenantForDisplay(tenant: Tenant): FormattedTenantData {
    return TenantDisplayService.formatTenantForDisplay(tenant);
  }

  /**
   * Filter and sort tenants based on view preferences
   */
  processTenantsWithPreferences(
    tenants: Tenant[],
    searchTerm: string,
    filterType: string,
    filterStatus: string,
    viewPreferences: TenantViewPreferences
  ): Tenant[] {
    let filtered = tenants;

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(tenant =>
        tenant.name.toLowerCase().includes(searchLower) ||
        tenant.slug.toLowerCase().includes(searchLower) ||
        tenant.owner_email?.toLowerCase().includes(searchLower)
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
      const aValue = a[viewPreferences.sortBy as keyof Tenant] || '';
      const bValue = b[viewPreferences.sortBy as keyof Tenant] || '';
      
      const comparison = String(aValue).localeCompare(String(bValue));
      return viewPreferences.sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }
}

export const tenantDataTransformationService = TenantDataTransformationService.getInstance();
