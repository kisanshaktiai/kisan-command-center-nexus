
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Eye, Edit, Trash2, Users, Calendar } from 'lucide-react';
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

  const handleView = (tenant: Tenant) => {
    onView(tenant);
  };

  const handleEdit = (tenant: Tenant) => {
    onEdit(tenant);
  };

  const handleDelete = (tenantId: string) => {
    onDelete(tenantId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Tenants Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Limits</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div>
                      <div className="font-medium">{tenant.name}</div>
                      <div className="text-sm text-muted-foreground">@{tenant.slug}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="capitalize">{tenant.type?.replace('_', ' ')}</span>
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
                  <TableCell>
                    <div className="text-sm">
                      <div>{tenant.owner_name || 'Not set'}</div>
                      {tenant.owner_email && (
                        <div className="text-muted-foreground">{tenant.owner_email}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3" />
                      {formatDate(tenant.created_at)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{tenant.max_farmers || 0} farmers</div>
                      <div>{tenant.max_dealers || 0} dealers</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(tenant)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(tenant)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(tenant.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
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
      </CardContent>
    </Card>
  );
};
