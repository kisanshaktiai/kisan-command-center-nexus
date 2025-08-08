
import { lazy } from 'react';
import { withLazyLoad } from '@/shared/components/LazyLoadWrapper';

// Lazy load major page components
export const LazyTenantManagement = lazy(() => 
  import('@/features/tenant/components/TenantManagementPage')
);

export const LazyTenantManagementRefactored = lazy(() => 
  import('@/pages/super-admin/TenantManagementRefactored')
);

export const LazyOverview = lazy(() => 
  import('@/pages/super-admin/Overview')
);

export const LazyOptimizedOverview = lazy(() => 
  import('@/pages/super-admin/OptimizedOverview')
);

export const LazyPlatformMonitoring = lazy(() => 
  import('@/pages/super-admin/PlatformMonitoring')
);

// Wrap with lazy load HOC
export const TenantManagementLazy = withLazyLoad(LazyTenantManagement);
export const TenantManagementRefactoredLazy = withLazyLoad(LazyTenantManagementRefactored);
export const OverviewLazy = withLazyLoad(LazyOverview);
export const OptimizedOverviewLazy = withLazyLoad(LazyOptimizedOverview);
export const PlatformMonitoringLazy = withLazyLoad(LazyPlatformMonitoring);
