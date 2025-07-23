
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Users, Calendar, MapPin, MoreHorizontal } from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { TenantService } from '@/services/tenantService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TenantCompactCardProps {
  tenant: Tenant;
  onView: (tenant: Tenant) => void;
  onEdit: (tenant: Tenant) => void;
  onDelete: (tenantId: string) => void;
}

export const TenantCompactCard: React.FC<TenantCompactCardProps> = ({
  tenant,
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

  const getFeatureCount = () => {
    if (!tenant.features) return 0;
    return Object.values(tenant.features).filter(Boolean).length;
  };

  const getBusinessAddress = () => {
    if (!tenant.business_address) return 'Not specified';
    if (typeof tenant.business_address === 'string') {
      return tenant.business_address;
    }
    return tenant.business_address?.city || 'Not specified';
  };

  return (
    <Card 
      className="hover:shadow-lg transition-all duration-200 cursor-pointer group"
      onClick={() => onView(tenant)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-base truncate">{tenant.name}</h3>
              <p className="text-sm text-muted-foreground truncate">{tenant.slug}</p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Badge 
              variant={TenantService.getStatusBadgeVariant(tenant.status)}
              className="text-xs"
            >
              {tenant.status?.toUpperCase()}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onView(tenant);
                }}>
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onEdit(tenant);
                }}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(tenant.id);
                  }}
                  className="text-destructive"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <Badge 
          variant={TenantService.getPlanBadgeVariant(tenant.subscription_plan)}
          className="text-xs"
        >
          {TenantService.getPlanDisplayName(tenant.subscription_plan)}
        </Badge>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">Type:</span>
          </div>
          <span className="text-muted-foreground capitalize text-xs truncate">
            {tenant.type?.replace('_', ' ')}
          </span>
          
          <div className="flex items-center space-x-2">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">Created:</span>
          </div>
          <span className="text-muted-foreground text-xs">
            {formatDate(tenant.created_at)}
          </span>
        </div>

        {tenant.owner_name && (
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">Owner:</span>
            </div>
            <div className="text-xs text-muted-foreground truncate ml-5">
              {tenant.owner_name}
            </div>
          </div>
        )}

        {tenant.business_address && (
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">Location:</span>
            </div>
            <div className="text-xs text-muted-foreground truncate ml-5">
              {getBusinessAddress()}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t">
          <div className="text-xs text-muted-foreground">
            {getFeatureCount()} features
          </div>
          <div className="flex gap-2">
            <div className="bg-muted/50 px-2 py-1 rounded text-xs">
              {tenant.max_farmers || 0} farmers
            </div>
            <div className="bg-muted/50 px-2 py-1 rounded text-xs">
              {tenant.max_dealers || 0} dealers
            </div>
          </div>
        </div>

        {tenant.status === 'trial' && tenant.trial_ends_at && (
          <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
            <div className="text-xs text-yellow-800">
              <span className="font-medium">Trial ends:</span>
              <span className="ml-1">{formatDate(tenant.trial_ends_at)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
