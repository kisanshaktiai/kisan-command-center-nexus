
import React from 'react';
import { TenantMetricsCard } from '@/components/tenant/TenantMetricsCard';
import { TenantListView } from '@/components/tenant/TenantListView';
import { Tenant } from '@/types/tenant';
import { TenantViewPreferences, TenantMetrics } from '@/types/tenantView';

interface TenantViewRendererProps {
  viewPreferences: TenantViewPreferences;
  sortedTenants: Tenant[];
  tenantMetrics: Record<string, TenantMetrics>;
  onEdit: (tenant: Tenant) => void;
  onDelete: (tenantId: string) => Promise<void>;
  onViewDetails: (tenant: Tenant) => void;
}

export const TenantViewRenderer: React.FC<TenantViewRendererProps> = ({
  viewPreferences,
  sortedTenants,
  tenantMetrics,
  onEdit,
  onDelete,
  onViewDetails
}) => {
  switch (viewPreferences.mode) {
    case 'small-cards':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedTenants.map((tenant) => (
            <TenantMetricsCard
              key={tenant.id}
              tenant={tenant}
              metrics={tenantMetrics[tenant.id]}
              size="small"
              onEdit={onEdit}
              onDelete={onDelete}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      );
    
    case 'large-cards':
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sortedTenants.map((tenant) => (
            <TenantMetricsCard
              key={tenant.id}
              tenant={tenant}
              metrics={tenantMetrics[tenant.id]}
              size="large"
              onEdit={onEdit}
              onDelete={onDelete}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      );
    
    case 'list':
      return (
        <TenantListView
          tenants={sortedTenants}
          metrics={tenantMetrics}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewDetails={onViewDetails}
        />
      );
    
    case 'analytics':
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {sortedTenants.map((tenant) => (
            <TenantMetricsCard
              key={tenant.id}
              tenant={tenant}
              metrics={tenantMetrics[tenant.id]}
              size="large"
              onEdit={onEdit}
              onDelete={onDelete}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      );
    
    default:
      return null;
  }
};
