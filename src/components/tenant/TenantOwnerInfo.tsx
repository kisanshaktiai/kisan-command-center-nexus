
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail, Phone, MapPin } from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { ErrorBoundary } from '@/components/providers/ErrorBoundary';

interface TenantOwnerInfoProps {
  tenant: Tenant;
}

const TenantOwnerInfoContent: React.FC<TenantOwnerInfoProps> = ({ tenant }) => {
  if (!tenant.owner_name && !tenant.owner_email && !tenant.owner_phone) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-4 w-4" />
          Owner Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tenant.owner_name && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-500" />
            <span className="text-sm">{tenant.owner_name}</span>
          </div>
        )}
        {tenant.owner_email && (
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-gray-500" />
            <span className="text-sm">{tenant.owner_email}</span>
          </div>
        )}
        {tenant.owner_phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-gray-500" />
            <span className="text-sm">{tenant.owner_phone}</span>
          </div>
        )}
        {tenant.business_address && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            <span className="text-sm">
              {typeof tenant.business_address === 'string' 
                ? tenant.business_address 
                : Object.values(tenant.business_address).filter(Boolean).join(', ')
              }
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const TenantOwnerInfo: React.FC<TenantOwnerInfoProps> = (props) => {
  return (
    <ErrorBoundary
      context={{
        component: 'TenantOwnerInfo',
        level: 'low',
        metadata: { tenantId: props.tenant.id }
      }}
    >
      <TenantOwnerInfoContent {...props} />
    </ErrorBoundary>
  );
};
