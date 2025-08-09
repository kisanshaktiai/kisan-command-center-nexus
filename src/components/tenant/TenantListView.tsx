
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Building2, Eye, Play, Pause } from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { tenantService } from '@/services/tenantService';
import { TenantMetrics } from '@/types/tenantView';
import { UsageMeter } from './UsageMeter';

interface TenantListViewProps {
  tenants: Tenant[];
  metrics?: Record<string, TenantMetrics>;
  onEdit: (tenant: Tenant) => void;
  onDelete: (tenantId: string) => void;
  onViewDetails: (tenant: Tenant) => void;
}

export const TenantListView: React.FC<TenantListViewProps> = ({
  tenants,
  metrics,
  onEdit,
  onDelete,
  onViewDetails,
}) => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const handleViewDetails = (e: React.MouseEvent, tenant: Tenant) => {
    e.stopPropagation();
    onViewDetails(tenant);
  };

  const handleEdit = (e: React.MouseEvent, tenant: Tenant) => {
    e.stopPropagation();
    onEdit(tenant);
  };

  const handleSuspendToggle = (e: React.MouseEvent, tenant: Tenant) => {
    e.stopPropagation();
    const isSuspended = tenant.status === 'suspended';
    if (window.confirm(
      isSuspended 
        ? 'Are you sure you want to reactivate this tenant?' 
        : 'Are you sure you want to suspend this tenant?'
    )) {
      onDelete(tenant.id);
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted/50 px-4 py-3 border-b">
        <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
          <div className="col-span-3">Organization</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Plan</div>
          <div className="col-span-2">Usage</div>
          <div className="col-span-1">Actions</div>
        </div>
      </div>
      
      <div className="divide-y">
        {tenants.map((tenant) => {
          const tenantMetrics = metrics?.[tenant.id];
          const isSuspended = tenant.status === 'suspended';
          
          return (
            <div
              key={tenant.id}
              className="px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => onViewDetails(tenant)}
            >
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* Organization */}
                <div className="col-span-3 flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium truncate">{tenant.name}</div>
                    <div className="text-sm text-muted-foreground">{tenant.slug}</div>
                  </div>
                </div>

                {/* Type */}
                <div className="col-span-2">
                  <span className="text-sm capitalize">{tenant.type?.replace('_', ' ')}</span>
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <Badge variant={tenantService.getStatusBadgeVariant(tenant.status)}>
                    {tenant.status?.toUpperCase()}
                  </Badge>
                </div>

                {/* Plan */}
                <div className="col-span-2">
                  <Badge variant={tenantService.getPlanBadgeVariant(tenant.subscription_plan)}>
                    {tenantService.getPlanDisplayName(tenant.subscription_plan)}
                  </Badge>
                </div>

                {/* Usage */}
                <div className="col-span-2">
                  {tenantMetrics ? (
                    <div className="space-y-1">
                      <UsageMeter
                        label=""
                        current={tenantMetrics.usageMetrics.farmers.current}
                        limit={tenantMetrics.usageMetrics.farmers.limit}
                        showDetails={false}
                      />
                      <div className="text-xs text-muted-foreground">
                        {tenantMetrics.usageMetrics.farmers.current}/{tenantMetrics.usageMetrics.farmers.limit} farmers
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">No data</span>
                  )}
                </div>

                {/* Actions */}
                <div className="col-span-1 flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleViewDetails(e, tenant)}
                    className="h-8 w-8 p-0"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleEdit(e, tenant)}
                    className="h-8 w-8 p-0"
                    title="Edit Tenant"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleSuspendToggle(e, tenant)}
                    className={`h-8 w-8 p-0 ${isSuspended ? 'text-green-600 hover:text-green-700' : 'text-orange-600 hover:text-orange-700'}`}
                    title={isSuspended ? 'Reactivate' : 'Suspend'}
                  >
                    {isSuspended ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
