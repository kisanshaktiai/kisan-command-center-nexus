
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Eye } from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { TenantService } from '@/services/tenantService';

interface TenantTableViewProps {
  tenants: Tenant[];
  onView: (tenant: Tenant) => void;
  onEdit: (tenant: Tenant) => void;
  onDelete: (tenantId: string) => void;
}

export const TenantTableView: React.FC<TenantTableViewProps> = ({
  tenants,
  onView,
  onEdit,
  onDelete
}) => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getFeatureCount = (tenant: Tenant) => {
    if (!tenant.features) return 0;
    return Object.values(tenant.features).filter(Boolean).length;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Features</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.map((tenant) => (
            <TableRow key={tenant.id} className="hover:bg-muted/50">
              <TableCell className="font-medium">
                <div>
                  <div className="font-semibold">{tenant.name}</div>
                  <div className="text-sm text-muted-foreground">{tenant.slug}</div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={TenantService.getStatusBadgeVariant(tenant.status)}>
                  {tenant.status?.toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={TenantService.getPlanBadgeVariant(tenant.subscription_plan)}>
                  {TenantService.getPlanDisplayName(tenant.subscription_plan)}
                </Badge>
              </TableCell>
              <TableCell className="capitalize">
                {tenant.type?.replace('_', ' ')}
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {tenant.owner_name || 'Not specified'}
                </div>
                {tenant.owner_email && (
                  <div className="text-xs text-muted-foreground">
                    {tenant.owner_email}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{getFeatureCount(tenant)}</span>
                  <span className="text-xs text-muted-foreground">enabled</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">{formatDate(tenant.created_at)}</div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView(tenant)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(tenant)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(tenant.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
