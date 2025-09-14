
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building } from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { ErrorBoundary } from '@/components/providers/ErrorBoundary';

interface TenantBasicInfoProps {
  tenant: Tenant;
}

const TenantBasicInfoContent: React.FC<TenantBasicInfoProps> = ({ tenant }) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building className="h-4 w-4" />
          Basic Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500">Organization Name</p>
            <p className="text-sm">{tenant.name}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Slug</p>
            <p className="text-sm font-mono">{tenant.slug}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Type</p>
            <p className="text-sm capitalize">{tenant.type.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Created</p>
            <p className="text-sm">{formatDate(tenant.created_at)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const TenantBasicInfo: React.FC<TenantBasicInfoProps> = (props) => {
  return (
    <ErrorBoundary
      context={{
        component: 'TenantBasicInfo',
        level: 'low',
        metadata: { tenantId: props.tenant.id }
      }}
    >
      <TenantBasicInfoContent {...props} />
    </ErrorBoundary>
  );
};
