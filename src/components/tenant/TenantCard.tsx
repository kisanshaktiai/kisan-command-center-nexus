
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building, Users, Calendar, Settings, Eye } from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { tenantService } from '@/services/tenantService';

interface TenantCardProps {
  tenant: Tenant;
  onViewDetails: (tenant: Tenant) => void;
  onEditTenant: (tenant: Tenant) => void;
}

export const TenantCard: React.FC<TenantCardProps> = ({
  tenant,
  onViewDetails,
  onEditTenant
}) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={tenant.branding?.logo_url} />
              <AvatarFallback className="bg-primary/10">
                {getInitials(tenant.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{tenant.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{tenant.slug}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={tenantService.getStatusBadgeVariant(tenant.status || 'unknown')}>
              {tenant.status || 'Unknown'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span className="capitalize">{(tenant.type || 'unknown').replace('_', ' ')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={tenantService.getPlanBadgeVariant(tenant.subscription_plan)}>
              {tenantService.getPlanDisplayName(tenant.subscription_plan)}
            </Badge>
          </div>
        </div>

        {tenant.owner_name && (
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{tenant.owner_name}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>Created: {formatDate(tenant.created_at)}</span>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(tenant)}
            className="flex items-center gap-1"
          >
            <Eye className="h-3 w-3" />
            View Details
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEditTenant(tenant)}
            className="flex items-center gap-1"
          >
            <Settings className="h-3 w-3" />
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TenantCard;
