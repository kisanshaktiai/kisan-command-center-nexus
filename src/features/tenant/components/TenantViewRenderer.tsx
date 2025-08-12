
import React from 'react';
import { TenantCardRefactored } from '@/components/tenant/TenantCardRefactored';
import { TenantListView } from '@/components/tenant/TenantListView';
import { TenantViewPreferences, TenantMetrics } from '@/types/tenantView';
import { Tenant } from '@/types/tenant';
import { FormattedTenantData } from '@/services/TenantDisplayService';

export interface TenantViewRendererProps {
  tenants: Tenant[];
  formattedTenants: FormattedTenantData[];
  viewPreferences: TenantViewPreferences;
  onEdit: (tenant: Tenant) => void;
  onDelete: (tenantId: string) => void;
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
          {tenants.map((tenant, index) => {
            const formattedData = formattedTenants[index];
            return (
              <div 
                key={tenant.id}
                className="cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-lg"
                onClick={() => onViewDetails(tenant)}
              >
                <TenantCardRefactored
                  tenant={tenant}
                  formattedData={formattedData}
                  size="large"
                  onEdit={(e) => {
                    e.stopPropagation();
                    onEdit(tenant);
                  }}
                  onDelete={(e) => {
                    e.stopPropagation();
                    onDelete(tenant.id);
                  }}
                  onViewDetails={() => onViewDetails(tenant)}
                  metrics={tenantMetrics[tenant.id]}
                />
              </div>
            );
          })}
        </div>
      );

    case 'list':
      return (
        <TenantListView
          tenants={tenants}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewDetails={onViewDetails}
        />
      );

    case 'analytics':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tenants.map((tenant, index) => {
            const formattedData = formattedTenants[index];
            return (
              <div 
                key={tenant.id}
                className="cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-lg"
                onClick={() => onViewDetails(tenant)}
              >
                <TenantCardRefactored
                  tenant={tenant}
                  formattedData={formattedData}
                  size="analytics"
                  onEdit={(e) => {
                    e.stopPropagation();
                    onEdit(tenant);
                  }}
                  onDelete={(e) => {
                    e.stopPropagation();
                    onDelete(tenant.id);
                  }}
                  onViewDetails={() => onViewDetails(tenant)}
                  metrics={tenantMetrics[tenant.id]}
                  showAnalytics={true}
                />
              </div>
            );
          })}
        </div>
      );

    case 'small-cards':
    default:
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {tenants.map((tenant, index) => {
            const formattedData = formattedTenants[index];
            return (
              <div 
                key={tenant.id}
                className="cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-lg rounded-lg"
                onClick={() => onViewDetails(tenant)}
              >
                <TenantCardRefactored
                  tenant={tenant}
                  formattedData={formattedData}
                  size="small"
                  onEdit={(e) => {
                    e.stopPropagation();
                    onEdit(tenant);
                  }}
                  onDelete={(e) => {
                    e.stopPropagation();
                    onDelete(tenant.id);
                  }}
                  onViewDetails={() => onViewDetails(tenant)}
                  metrics={tenantMetrics[tenant.id]}
                />
              </div>
            );
          })}
        </div>
      );
  }
};
