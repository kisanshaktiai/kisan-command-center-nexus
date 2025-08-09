
// Re-export all tenant-related types from centralized location
export * from '@/types/tenant';
export * from '@/types/tenantView';

// Additional feature-specific types
export interface TenantFeatureConfig {
  enableAnalytics: boolean;
  enableBranding: boolean;
  enableMetrics: boolean;
}

export interface TenantManagementContext {
  currentTenant?: string;
  viewMode: 'grid' | 'list' | 'analytics';
  filters: {
    search: string;
    status: string;
    type: string;
  };
}
