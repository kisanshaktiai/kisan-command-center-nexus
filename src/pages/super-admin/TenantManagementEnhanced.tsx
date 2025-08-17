
import React from 'react';
import { TenantAccessValidator } from '@/components/tenant/TenantAccessValidator';
import { useTenantManagementWithAccess } from '@/hooks/useTenantManagementWithAccess';
import { TenantViewPreferences } from '@/types/tenantView';
import { useState } from 'react';

const TenantManagementEnhanced: React.FC = () => {
  const [viewPreferences] = useState<TenantViewPreferences>({
    mode: 'small-cards',
    density: 'comfortable',
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const {
    tenants,
    isLoading,
    error,
    validateAccessForTenant,
    isValidatingAccess
  } = useTenantManagementWithAccess({
    filters: {
      search: searchTerm,
      type: filterType || undefined,
      status: filterStatus || undefined,
    },
    enabled: true,
    autoValidateAccess: true
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading tenant data with access validation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <p className="text-destructive">Error: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Enhanced Tenant Management</h1>
        {isValidatingAccess && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span>Validating access...</span>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search tenants..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Types</option>
          <option value="agri_company">Agricultural Company</option>
          <option value="dealer">Dealer</option>
          <option value="ngo">NGO</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Tenant List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tenants.map((tenant) => (
          <TenantAccessValidator 
            key={tenant.id} 
            tenantId={tenant.id}
            showValidationStatus={false}
          >
            <div className="p-6 border border-border rounded-lg hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-2">{tenant.name}</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><span className="font-medium">Status:</span> {tenant.status}</p>
                <p><span className="font-medium">Plan:</span> {tenant.subscription_plan}</p>
                <p><span className="font-medium">Created:</span> {new Date(tenant.created_at).toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => validateAccessForTenant(tenant.id)}
                className="mt-4 w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Validate Access
              </button>
            </div>
          </TenantAccessValidator>
        ))}
      </div>

      {tenants.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No tenants found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

export default TenantManagementEnhanced;
