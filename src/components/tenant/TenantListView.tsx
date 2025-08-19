
import React from 'react';
import { Tenant } from '@/types/tenant';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, Edit } from 'lucide-react';

interface TenantListViewProps {
  tenants: any[];
  onViewDetails: (tenant: Tenant) => void;
  onEditTenant: (tenant: Tenant) => void;
}

export const TenantListView: React.FC<TenantListViewProps> = ({
  tenants,
  onViewDetails,
  onEditTenant
}) => {
  if (!tenants?.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No tenants found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tenants.map((tenant) => (
        <Card key={tenant.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">{tenant.name}</h3>
                    <p className="text-muted-foreground">{tenant.owner_email}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{tenant.type}</Badge>
                    <Badge variant="secondary">{tenant.status}</Badge>
                    <Badge variant="default">{tenant.subscription_plan}</Badge>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails(tenant)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditTenant(tenant)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
