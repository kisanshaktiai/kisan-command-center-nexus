
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Edit, Pause, Play } from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { TenantViewMode } from '@/types/tenantView';

interface TenantCardProps {
  tenant: Tenant;
  viewMode: TenantViewMode;
  onSelect: (tenant: Tenant) => void;
  onEdit: (tenant: Tenant) => void;
  onSuspend: (id: string) => void;
  onReactivate: (id: string) => void;
}

export const TenantCard: React.FC<TenantCardProps> = ({
  tenant,
  viewMode,
  onSelect,
  onEdit,
  onSuspend,
  onReactivate
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'trial':
        return 'bg-blue-100 text-blue-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'Kisan_Basic':
        return 'bg-gray-100 text-gray-800';
      case 'Shakti_Growth':
        return 'bg-blue-100 text-blue-800';
      case 'AI_Enterprise':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlanDisplayName = (plan: string) => {
    switch (plan) {
      case 'Kisan_Basic':
        return 'Kisan Basic';
      case 'Shakti_Growth':
        return 'Shakti Growth';
      case 'AI_Enterprise':
        return 'AI Enterprise';
      case 'custom':
        return 'Custom Plan';
      default:
        return plan;
    }
  };

  if (viewMode === 'list') {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h3 className="font-medium">{tenant.name}</h3>
                <p className="text-sm text-muted-foreground">{tenant.slug}</p>
              </div>
              <Badge className={getStatusColor(tenant.status)}>
                {tenant.status.replace('_', ' ')}
              </Badge>
              <Badge className={getPlanColor(tenant.subscription_plan)}>
                {getPlanDisplayName(tenant.subscription_plan)}
              </Badge>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onSelect(tenant)}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(tenant)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                {tenant.status === 'suspended' ? (
                  <DropdownMenuItem onClick={() => onReactivate(tenant.id)}>
                    <Play className="w-4 h-4 mr-2" />
                    Reactivate
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onSuspend(tenant.id)}>
                    <Pause className="w-4 h-4 mr-2" />
                    Suspend
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelect(tenant)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{tenant.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{tenant.slug}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelect(tenant); }}>
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(tenant); }}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {tenant.status === 'suspended' ? (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onReactivate(tenant.id); }}>
                  <Play className="w-4 h-4 mr-2" />
                  Reactivate
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSuspend(tenant.id); }}>
                  <Pause className="w-4 h-4 mr-2" />
                  Suspend
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge className={getStatusColor(tenant.status)}>
              {tenant.status.replace('_', ' ')}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Plan</span>
            <Badge className={getPlanColor(tenant.subscription_plan)}>
              {getPlanDisplayName(tenant.subscription_plan)}
            </Badge>
          </div>
          {tenant.owner_email && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Owner</span>
              <span className="text-sm truncate max-w-32">{tenant.owner_email}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Created</span>
            <span className="text-sm">
              {new Date(tenant.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
