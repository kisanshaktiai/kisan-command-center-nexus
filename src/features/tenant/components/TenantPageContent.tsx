
import React from 'react';
import { TenantFilters } from '@/components/tenant/TenantFilters';
import { TenantCreateDialog } from '@/components/tenant/TenantCreateDialog';
import { TenantListView } from '@/components/tenant/TenantListView';
import { TenantGridView } from '@/components/tenant/TenantGridView';
import { Tenant } from '@/types/tenant';
import { TenantViewPreferences } from '@/types/tenantView';
import { CreateTenantDTO } from '@/types/tenant';

interface TenantPageContentProps {
  // Data
  formattedTenants: any[];
  
  // View preferences
  viewPreferences: TenantViewPreferences;
  setViewPreferences: (preferences: TenantViewPreferences) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterType: string;
  setFilterType: (type: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;

  // Actions
  onCreateTenant: (data: CreateTenantDTO) => Promise<boolean>;
  onViewDetails: (tenant: Tenant) => void;
  onEditTenant: (tenant: Tenant) => void;
}

export const TenantPageContent: React.FC<TenantPageContentProps> = ({
  formattedTenants,
  viewPreferences,
  setViewPreferences,
  searchTerm,
  setSearchTerm,
  filterType,
  setFilterType,
  filterStatus,
  setFilterStatus,
  onCreateTenant,
  onViewDetails,
  onEditTenant
}) => {
  return (
    <div className="space-y-6">
      <TenantFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterType={filterType}
        setFilterType={setFilterType}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
      />

      <TenantCreateDialog 
        isOpen={false}
        onClose={() => {}}
        onCreateTenant={onCreateTenant} 
      />

      {viewPreferences.mode === 'list' ? (
        <TenantListView
          tenants={formattedTenants as any[]}
          onViewDetails={onViewDetails}
          onEditTenant={onEditTenant}
        />
      ) : (
        <TenantGridView
          tenants={formattedTenants as any[]}
          viewMode={viewPreferences.mode === 'analytics' ? 'grid' : viewPreferences.mode}
          onViewDetails={onViewDetails}
          onEditTenant={onEditTenant}
        />
      )}
    </div>
  );
};
