
import React, { memo, useCallback } from 'react';
import { TenantCard } from '@/components/tenant/TenantCard';
import { TenantListView } from '@/components/tenant/TenantListView';
import { TenantViewPreferences, TenantMetrics } from '@/types/tenantView';
import { Tenant } from '@/types/tenant';

export interface TenantViewRendererProps {
  tenants: Tenant[];
  viewPreferences: TenantViewPreferences;
  onEdit: (tenant: Tenant) => void;
  onDelete: (tenantId: string) => void;
  onViewDetails: (tenant: Tenant) => void;
  tenantMetrics: Record<string, TenantMetrics>;
}

const TenantViewRenderer = memo<TenantViewRendererProps>(({
  tenants,
  viewPreferences,
  onEdit,
  onDelete,
  onViewDetails,
  tenantMetrics
}) => {
  const handleEdit = useCallback((tenant: Tenant) => {
    onEdit(tenant);
  }, [onEdit]);

  const handleDelete = useCallback((tenantId: string) => {
    onDelete(tenantId);
  }, [onDelete]);

  const handleViewDetails = useCallback((tenant: Tenant) => {
    onViewDetails(tenant);
  }, [onViewDetails]);

  if (tenants.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">No tenants found</p>
        <p className="text-muted-foreground text-sm mt-2">
          Adjust your filters or create a new tenant to get started
        </p>
      </div>
    );
  }

  switch (viewPreferences.mode) {
    case 'large-cards':
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {tenants.map((tenant) => (
            <TenantCard
              key={tenant.id}
              tenant={tenant}
              size="large"
              onEdit={() => handleEdit(tenant)}
              onDelete={() => handleDelete(tenant.id)}
              onViewDetails={() => handleViewDetails(tenant)}
              metrics={tenantMetrics[tenant.id]}
            />
          ))}
        </div>
      );

    case 'list':
      return (
        <TenantListView
          tenants={tenants}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewDetails={handleViewDetails}
        />
      );

    case 'analytics':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tenants.map((tenant) => (
            <TenantCard
              key={tenant.id}
              tenant={tenant}
              size="analytics"
              onEdit={() => handleEdit(tenant)}
              onDelete={() => handleDelete(tenant.id)}
              onViewDetails={() => handleViewDetails(tenant)}
              metrics={tenantMetrics[tenant.id]}
              showAnalytics={true}
            />
          ))}
        </div>
      );

    case 'small-cards':
    default:
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {tenants.map((tenant) => (
            <TenantCard
              key={tenant.id}
              tenant={tenant}
              size="small"
              onEdit={() => handleEdit(tenant)}
              onDelete={() => handleDelete(tenant.id)}
              onViewDetails={() => handleViewDetails(tenant)}
              metrics={tenantMetrics[tenant.id]}
            />
          ))}
        </div>
      );
  }
});

TenantViewRenderer.displayName = 'TenantViewRenderer';

export { TenantViewRenderer };
