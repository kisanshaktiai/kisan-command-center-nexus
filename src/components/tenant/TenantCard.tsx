import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { 
  MoreVertical, 
  Building2, 
  Users, 
  Calendar,
  Edit,
  Pause,
  Play,
  Archive
} from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { formatDistanceToNow } from 'date-fns';

interface TenantCardProps {
  tenant: Tenant;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onSuspend?: () => void;
  onReactivate?: () => void;
  onArchive?: () => void;
}

export const TenantCard: React.FC<TenantCardProps> = ({ 
  tenant, 
  onEdit, 
  onDelete,
  onSuspend,
  onReactivate,
  onArchive 
}) => {
  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      trial: 'secondary',
      suspended: 'destructive',
      cancelled: 'destructive',
      archived: 'outline',
      pending_approval: 'outline'
    } as const;
    
    return variants[status as keyof typeof variants] || 'outline';
  };

  const getTenantActions = () => {
    const actions = [];

    // Edit action (always available)
    actions.push(
      <DropdownMenuItem key="edit" onClick={onEdit}>
        <Edit className="h-4 w-4 mr-2" />
        Edit Tenant
      </DropdownMenuItem>
    );

    // Status-specific actions
    if (tenant.status === 'active' || tenant.status === 'trial') {
      actions.push(
        <DropdownMenuItem 
          key="suspend" 
          onClick={onSuspend}
          className="text-orange-600"
        >
          <Pause className="h-4 w-4 mr-2" />
          Suspend Tenant
        </DropdownMenuItem>
      );
    }

    if (tenant.status === 'suspended') {
      actions.push(
        <DropdownMenuItem 
          key="reactivate" 
          onClick={onReactivate}
          className="text-green-600"
        >
          <Play className="h-4 w-4 mr-2" />
          Reactivate Tenant
        </DropdownMenuItem>
      );
      
      actions.push(
        <DropdownMenuSeparator key="sep-archive" />,
        <DropdownMenuItem 
          key="archive" 
          onClick={onArchive}
          className="text-blue-600"
        >
          <Archive className="h-4 w-4 mr-2" />
          Archive Data
        </DropdownMenuItem>
      );
    }

    return actions;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <Building2 className="h-5 w-5 text-blue-500" />
          <Badge variant={getStatusBadge(tenant.status)}>
            {tenant.status}
          </Badge>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {getTenantActions()}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-lg">{tenant.name}</h3>
            <p className="text-sm text-gray-600">@{tenant.slug}</p>
          </div>
          
          <div className="space-y-2 text-sm">
            {tenant.owner_email && (
              <div className="flex items-center text-gray-600">
                <Users className="h-4 w-4 mr-2" />
                <span className="truncate">{tenant.owner_email}</span>
              </div>
            )}
            <div className="flex items-center text-gray-600">
              <Calendar className="h-4 w-4 mr-2" />
              <span>Created {formatDistanceToNow(new Date(tenant.created_at))} ago</span>
            </div>
          </div>

          {tenant.subscription_plan && (
            <div className="pt-2 border-t">
              <Badge variant="outline" className="text-xs">
                {tenant.subscription_plan.replace('_', ' ')}
              </Badge>
            </div>
          )}

          {/* Show suspension/archive info */}
          {tenant.status === 'suspended' && tenant.suspended_at && (
            <div className="pt-2 border-t">
              <p className="text-xs text-orange-600">
                Suspended {formatDistanceToNow(new Date(tenant.suspended_at))} ago
              </p>
            </div>
          )}
          
          {tenant.status === 'archived' && tenant.archived_at && (
            <div className="pt-2 border-t">
              <p className="text-xs text-blue-600">
                Archived {formatDistanceToNow(new Date(tenant.archived_at))} ago
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
