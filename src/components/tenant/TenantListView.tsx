
import React from 'react';
import { TenantCard } from './TenantCard';
import { Tenant } from '@/types/tenant';
import { TenantViewPreferences } from '@/types/tenantView';

interface TenantListViewProps {
  tenants: Tenant[];
  viewPreferences: TenantViewPreferences;
  onTenantSelect: (tenant: Tenant) => void;
  onTenantEdit: (tenant: Tenant) => void;
  onTenantSuspend: (id: string) => void;
  onTenantReactivate: (id: string) => void;
  onEdit: (tenant: Tenant) => void;
  onDelete: (tenantId: string) => void;
  onViewDetails: (tenant: Tenant) => void;
  isLoading?: boolean;
}

export const TenantListView: React.FC<TenantListViewProps> = ({
  tenants,
  viewPreferences,
  onTenantSelect,
  onTenantEdit,
  onTenantSuspend,
  onTenantReactivate,
  onEdit,
  onDelete,
  onViewDetails,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-card rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-muted rounded w-1/2 mb-4"></div>
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded"></div>
              <div className="h-3 bg-muted rounded w-5/6"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No tenants found matching your criteria.</p>
      </div>
    );
  }

  const getGridClasses = () => {
    switch (viewPreferences.mode) {
      case 'large-cards':
        return 'grid grid-cols-1 lg:grid-cols-2 gap-6';
      case 'small-cards':
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';
      case 'list':
        return 'space-y-4';
      default:
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
    }
  };

  const handleEdit = (tenant: Tenant) => {
    onTenantEdit(tenant);
    onEdit(tenant);
  };

  const handleSelect = (tenant: Tenant) => {
    onTenantSelect(tenant);
    onViewDetails(tenant);
  };

  const handleSuspend = (id: string) => {
    onTenantSuspend(id);
    onDelete(id);
  };

  return (
    <div className={getGridClasses()}>
      {tenants.map((tenant) => (
        <TenantCard
          key={tenant.id}
          tenant={tenant}
          viewMode={viewPreferences.mode}
          onSelect={handleSelect}
          onEdit={handleEdit}
          onSuspend={handleSuspend}
          onReactivate={onTenantReactivate}
        />
      ))}
    </div>
  );
};
