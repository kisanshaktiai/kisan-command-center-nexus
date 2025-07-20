
import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Edit, Trash2 } from 'lucide-react';
import { Tenant, tenantTypeOptions } from '@/types/tenant';
import { TenantService } from '@/services/tenantService';

interface TenantCardProps {
  tenant: Tenant;
  onEdit: (tenant: Tenant) => void;
  onDelete: (tenantId: string) => void;
}

export const TenantCard: React.FC<TenantCardProps> = ({ tenant, onEdit, onDelete }) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{tenant.name}</CardTitle>
          </div>
          <div className="flex space-x-1">
            <Button variant="ghost" size="sm" onClick={() => onEdit(tenant)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(tenant.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardDescription>
          <span className="font-medium">@{tenant.slug}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Status</span>
          <Badge variant={TenantService.getStatusBadgeVariant(tenant.status)}>
            {tenant.status || 'trial'}
          </Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Plan</span>
          <Badge variant={TenantService.getPlanBadgeVariant(tenant.subscription_plan)}>
            {TenantService.getPlanDisplayName(tenant.subscription_plan)}
          </Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Type</span>
          <span className="text-sm font-medium">
            {tenantTypeOptions.find(t => t.value === tenant.type)?.label || tenant.type}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Farmers</span>
          <span className="text-sm font-medium">{tenant.max_farmers || 1000}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Created</span>
          <span className="text-sm">
            {tenant.created_at ? new Date(tenant.created_at).toLocaleDateString() : 'N/A'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
