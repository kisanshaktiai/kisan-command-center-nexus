
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
  // Safety check for data consistency
  if (!tenants || tenants.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">No tenants found</p>
        <p className="text-muted-foreground text-sm mt-2">
          Adjust your filters or create a new tenant to get started
        </p>
      </div>
    );
  }

  // Ensure formattedTenants array matches tenants array length
  const safeFormattedTenants = formattedTenants || [];
  
  const createFallbackFormattedData = (tenant: Tenant): FormattedTenantData => ({
    id: tenant.id || '',
    name: tenant.name || 'Unknown Tenant',
    slug: tenant.slug || 'no-slug',
    displayType: tenant.type || 'Unknown',
    displayStatus: tenant.status || 'Unknown',
    statusBadgeVariant: 'secondary',
    planBadgeVariant: 'outline',
    planDisplayName: tenant.subscription_plan || 'Unknown Plan',
    ownerEmail: tenant.owner_email || 'Not provided',
    ownerName: tenant.owner_name || 'Not provided',
    ownerPhone: tenant.owner_phone || 'Not provided',
    formattedCreatedAt: tenant.created_at ? new Date(tenant.created_at).toLocaleDateString() : 'Unknown',
    formattedUpdatedAt: tenant.updated_at ? new Date(tenant.updated_at).toLocaleDateString() : 'Unknown',
    formattedBusinessAddress: 'Not provided',
    limitsDisplay: {
      farmers: tenant.max_farmers?.toString() || 'Unlimited',
      dealers: tenant.max_dealers?.toString() || 'Unlimited',
      storage: tenant.max_storage_gb ? `${tenant.max_storage_gb} GB` : 'Unlimited',
      apiCalls: tenant.max_api_calls_per_day?.toString() || 'Unlimited'
    },
    domainInfo: {
      subdomain: tenant.subdomain,
      customDomain: tenant.custom_domain
    }
  });
  
  const renderTenantCard = (tenant: Tenant, index: number) => {
    // Safety check for tenant object
    if (!tenant || !tenant.id || !tenant.name) {
      console.warn('Invalid tenant object at index:', index, tenant);
      return null;
    }

    const formattedData = safeFormattedTenants[index] || createFallbackFormattedData(tenant);

    return (
      <TenantCardRefactored
        key={tenant.id}
        tenant={tenant}
        formattedData={formattedData}
        size="small"
        onEdit={() => onEdit(tenant)}
        onDelete={() => onDelete(tenant.id)}
        onViewDetails={() => onViewDetails(tenant)}
        metrics={tenantMetrics[tenant.id]}
      />
    );
  };

  switch (viewPreferences.mode) {
    case 'large-cards':
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {tenants.map((tenant, index) => {
            if (!tenant) return null;
            const formattedData = safeFormattedTenants[index] || createFallbackFormattedData(tenant);
            
            return (
              <TenantCardRefactored
                key={tenant.id}
                tenant={tenant}
                formattedData={formattedData}
                size="large"
                onEdit={() => onEdit(tenant)}
                onDelete={() => onDelete(tenant.id)}
                onViewDetails={() => onViewDetails(tenant)}
                metrics={tenantMetrics[tenant.id]}
              />
            );
          })}
        </div>
      );

    case 'list':
      return (
        <TenantListView
          tenants={tenants.filter(tenant => tenant && tenant.id && tenant.name)}
          viewPreferences={viewPreferences}
          onTenantSelect={onViewDetails}
          onTenantEdit={onEdit}
          onTenantSuspend={onDelete}
          onTenantReactivate={(id: string) => {
            const tenant = tenants.find(t => t && t.id === id);
            if (tenant) onViewDetails(tenant);
          }}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewDetails={onViewDetails}
        />
      );

    case 'analytics':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tenants.map((tenant, index) => {
            if (!tenant) return null;
            const formattedData = safeFormattedTenants[index] || createFallbackFormattedData(tenant);
            
            return (
              <TenantCardRefactored
                key={tenant.id}
                tenant={tenant}
                formattedData={formattedData}
                size="analytics"
                onEdit={() => onEdit(tenant)}
                onDelete={() => onDelete(tenant.id)}
                onViewDetails={() => onViewDetails(tenant)}
                metrics={tenantMetrics[tenant.id]}
                showAnalytics={true}
              />
            );
          })}
        </div>
      );

    case 'small-cards':
    default:
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {tenants.map(renderTenantCard).filter(Boolean)}
        </div>
      );
  }
};
