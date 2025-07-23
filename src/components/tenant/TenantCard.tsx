
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Eye, Users, Calendar, Settings, Building2 } from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { TenantService } from '@/services/tenantService';

interface TenantCardProps {
  tenant: Tenant;
  onEdit: (tenant: Tenant) => void;
  onDelete: (tenantId: string) => void;
  onView?: (tenant: Tenant) => void;
}

export const TenantCard: React.FC<TenantCardProps> = ({
  tenant,
  onEdit,
  onDelete,
  onView
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

  const handleCardClick = () => {
    if (onView) {
      onView(tenant);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow duration-200 border-l-4 border-l-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Left section - Main info */}
          <div 
            className="flex items-center gap-4 flex-1 cursor-pointer"
            onClick={handleCardClick}
          >
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-foreground truncate">
                  {tenant.name}
                </h3>
                <Badge variant={TenantService.getStatusBadgeVariant(tenant.status)} className="text-xs">
                  {tenant.status?.toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="font-medium">@{tenant.slug}</span>
                </span>
                <span className="capitalize">{tenant.type?.replace('_', ' ')}</span>
                {tenant.owner_name && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {tenant.owner_name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center section - Plan and metrics */}
          <div className="flex items-center gap-6 px-4">
            <div className="text-center">
              <Badge variant={TenantService.getPlanBadgeVariant(tenant.subscription_plan)} className="text-xs">
                {TenantService.getPlanDisplayName(tenant.subscription_plan)}
              </Badge>
              <div className="text-xs text-muted-foreground mt-1">Plan</div>
            </div>
            
            <div className="text-center">
              <div className="text-sm font-medium text-foreground">{getFeatureCount()}</div>
              <div className="text-xs text-muted-foreground">Features</div>
            </div>
            
            <div className="text-center">
              <div className="text-sm font-medium text-foreground">
                {tenant.max_farmers?.toLocaleString() || '0'}
              </div>
              <div className="text-xs text-muted-foreground">Farmers</div>
            </div>
          </div>

          {/* Right section - Date and actions */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatDate(tenant.created_at)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Created</div>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onView) onView(tenant);
                }}
                className="h-8 w-8 p-0"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(tenant);
                }}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(tenant.id);
                }}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
