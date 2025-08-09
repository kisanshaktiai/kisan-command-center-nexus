
import React from 'react';
import { Tenant } from '@/types/tenant';
import { FormattedTenantData } from '@/services/TenantDisplayService';
import { TenantViewPreferences, TenantMetrics } from '@/types/tenantView';
import { TenantCardRefactured } from '@/components/tenant/TenantCardRefactored';
import { TenantListView } from '@/components/tenant/TenantListView';

interface TenantViewRendererProps {
  tenants: Tenant[];
  formattedTenants: FormattedTenantData[];
  viewPreferences: TenantViewPreferences;
  onEdit: (tenant: Tenant) => void;
  onDelete: (tenantId: string) => Promise<boolean>;
  onViewDetails: (tenant: Tenant) => void;
  tenantMetrics: Record<string, TenantMetrics>;
}

export const TenantViewRenderer: React.FC<TenantViewRendererProps> = ({
  tenants,
  formattedTenants,
  viewPreferences,
  onEdit,
  onDelete,
  onViewDetails,
  tenantMetrics
}) => {
  const handleEdit = (tenant: Tenant) => {
    console.log('TenantViewRenderer: Edit clicked for tenant:', tenant.id);
    onEdit(tenant);
  };

  const handleDelete = async (tenantId: string) => {
    console.log('TenantViewRenderer: Delete clicked for tenant:', tenantId);
    return await onDelete(tenantId);
  };

  const handleViewDetails = (tenant: Tenant) => {
    console.log('TenantViewRenderer: View details clicked for tenant:', tenant.id);
    onViewDetails(tenant);
  };

  if (viewPreferences.mode === 'list') {
    return (
      <TenantListView
        tenants={tenants}
        metrics={tenantMetrics}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onViewDetails={handleViewDetails}
      />
    );
  }

  // Grid view for cards
  const getGridCols = () => {
    switch (viewPreferences.mode) {
      case 'large-cards':
        return 'grid-cols-1 lg:grid-cols-2';
      case 'analytics':
        return 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3';
      default: // small-cards
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
    }
  };

  const getDensitySpacing = () => {
    switch (viewPreferences.density) {
      case 'compact':
        return 'gap-3';
      case 'spacious':
        return 'gap-8';
      default: // comfortable
        return 'gap-6';
    }
  };

  return (
    <div className={`grid ${getGridCols()} ${getDensitySpacing()}`}>
      {tenants.map((tenant, index) => {
        const formattedData = formattedTenants[index];
        if (!formattedData) return null;

        return (
          <TenantCardRefactured
            key={tenant.id}
            tenant={tenant}
            formattedData={formattedData}
            size={viewPreferences.mode === 'large-cards' ? 'large' : viewPreferences.mode === 'analytics' ? 'analytics' : 'small'}
            onEdit={() => handleEdit(tenant)}
            onDelete={() => handleDelete(tenant.id)}
            onViewDetails={() => handleViewDetails(tenant)}
            metrics={tenantMetrics[tenant.id]}
            showAnalytics={viewPreferences.mode === 'analytics'}
          />
        );
      })}
    </div>
  );
};
