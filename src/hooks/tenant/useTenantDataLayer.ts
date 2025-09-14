
import { useMemo } from 'react';
import { useTenantData } from '@/features/tenant/hooks/useTenantData';
import { tenantDataTransformationService } from '@/services/TenantDataTransformationService';
import { TenantViewPreferences } from '@/types/tenantView';

interface UseTenantDataLayerOptions {
  searchTerm: string;
  filterType: string;
  filterStatus: string;
  viewPreferences: TenantViewPreferences;
  initialFilters?: {
    search?: string;
    type?: string;
    status?: string;
  };
}

/**
 * Focused hook for tenant data management and transformations
 * Handles: Data fetching, filtering, sorting, and formatting
 */
export const useTenantDataLayer = (options: UseTenantDataLayerOptions) => {
  const { searchTerm, filterType, filterStatus, viewPreferences, initialFilters } = options;

  // Fetch raw tenant data
  const { data: rawTenants = [], isLoading, error } = useTenantData({ 
    filters: initialFilters 
  });

  // Process and transform tenants
  const processedTenants = useMemo(() => {
    return tenantDataTransformationService.processTenantsWithPreferences(
      rawTenants,
      searchTerm,
      filterType,
      filterStatus,
      viewPreferences
    );
  }, [rawTenants, searchTerm, filterType, filterStatus, viewPreferences]);

  // Format tenants for display
  const formattedTenants = useMemo(() => {
    return tenantDataTransformationService.formatTenantsForDisplay(processedTenants);
  }, [processedTenants]);

  return {
    // Raw data
    rawTenants,
    
    // Processed data
    processedTenants,
    formattedTenants,
    
    // State
    isLoading,
    error,
    
    // Computed properties
    totalCount: rawTenants.length,
    filteredCount: processedTenants.length,
  };
};
