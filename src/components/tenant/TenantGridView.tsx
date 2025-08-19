
import React from 'react';
import { Tenant } from '@/types/tenant';
import { TenantCard } from './TenantCard';

interface TenantGridViewProps {
  tenants: Tenant[];
  viewMode: 'grid' | 'small-cards' | 'large-cards';
  onViewDetails: (tenant: Tenant) => void;
  onEditTenant: (tenant: Tenant) => void;
}

export const TenantGridView: React.FC<TenantGridViewProps> = ({
  tenants,
  viewMode,
  onViewDetails,
  onEditTenant
}) => {
  const getGridClasses = () => {
    switch (viewMode) {
      case 'large-cards':
        return 'grid grid-cols-1 md:grid-cols-2 gap-6';
      case 'small-cards':
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';
      default:
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
    }
  };

  return (
    <div className={getGridClasses()}>
      {tenants.map((tenant) => (
        <TenantCard
          key={tenant.id}
          tenant={tenant}
          viewMode={viewMode}
          onViewDetails={onViewDetails}
          onEditTenant={onEditTenant}
        />
      ))}
    </div>
  );
};
