
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Edit, Trash2, Users, Crown, Calendar, MapPin, BarChart3 } from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { TenantService } from '@/services/tenantService';
import { TenantMetrics } from '@/types/tenantView';

interface TenantCardProps {
  tenant: Tenant;
  size?: 'small' | 'large' | 'analytics';
  showAnalytics?: boolean;
  metrics?: TenantMetrics;
  onEdit: (tenant: Tenant) => void;
  onDelete: (tenantId: string) => void;
  onViewDetails?: (tenant: Tenant) => void;
}

export const TenantCard: React.FC<TenantCardProps> = ({ 
  tenant, 
  size = 'small',
  showAnalytics = false,
  metrics,
  onEdit, 
  onDelete,
  onViewDetails
}) => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const getFeatureCount = () => {
    if (!tenant.features) return 0;
    return Object.values(tenant.features).filter(Boolean).length;
  };

  const isLarge = size === 'large';
  const isAnalytics = size === 'analytics' || showAnalytics;

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className={`font-semibold truncate ${isLarge ? 'text-xl' : 'text-lg'}`}>
                {tenant.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {tenant.slug}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Badge variant={TenantService.getStatusBadgeVariant(tenant.status)}>
              {tenant.status?.toUpperCase()}
            </Badge>
            <Badge variant={TenantService.getPlanBadgeVariant(tenant.subscription_plan)}>
              {TenantService.getPlanDisplayName(tenant.subscription_plan)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Crown className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Type:</span>
            <span className="text-muted-foreground capitalize">{tenant.type?.replace('_', ' ')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Created:</span>
            <span className="text-muted-foreground">{formatDate(tenant.created_at)}</span>
          </div>
        </div>

        {/* Analytics Section */}
        {isAnalytics && metrics && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Usage Metrics</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-muted/50 p-2 rounded">
                <div className="font-medium">Farmers</div>
                <div className="text-muted-foreground">
                  {metrics.usageMetrics?.farmers?.current || 0}/{metrics.usageMetrics?.farmers?.limit || 0}
                </div>
              </div>
              <div className="bg-muted/50 p-2 rounded">
                <div className="font-medium">Storage</div>
                <div className="text-muted-foreground">
                  {metrics.usageMetrics?.storage?.current || 0} GB
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Owner Info - Only show in large cards or if analytics is off */}
        {(isLarge || !isAnalytics) && tenant.owner_name && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Owner Information</h4>
            <div className="grid grid-cols-1 gap-1 text-sm">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{tenant.owner_name}</span>
              </div>
              {tenant.owner_email && (
                <div className="text-muted-foreground text-xs ml-6">
                  {tenant.owner_email}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Location */}
        {!isAnalytics && tenant.business_address && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Location:</span>
              <span className="text-muted-foreground truncate">
                {typeof tenant.business_address === 'string' 
                  ? tenant.business_address 
                  : tenant.business_address?.city || 'Not specified'
                }
              </span>
            </div>
          </div>
        )}

        {/* Plan Limits - Show in large cards or when not in analytics mode */}
        {(isLarge || !isAnalytics) && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Plan Limits</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-muted/50 p-2 rounded">
                <div className="font-medium">Farmers</div>
                <div className="text-muted-foreground">{tenant.max_farmers?.toLocaleString() || 'N/A'}</div>
              </div>
              <div className="bg-muted/50 p-2 rounded">
                <div className="font-medium">Dealers</div>
                <div className="text-muted-foreground">{tenant.max_dealers?.toLocaleString() || 'N/A'}</div>
              </div>
              <div className="bg-muted/50 p-2 rounded">
                <div className="font-medium">Products</div>
                <div className="text-muted-foreground">{tenant.max_products?.toLocaleString() || 'N/A'}</div>
              </div>
              <div className="bg-muted/50 p-2 rounded">
                <div className="font-medium">Storage</div>
                <div className="text-muted-foreground">{tenant.max_storage_gb || 'N/A'} GB</div>
              </div>
            </div>
          </div>
        )}

        {/* Features */}
        {!isAnalytics && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Features Enabled</h4>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {getFeatureCount()} features enabled
              </span>
              {tenant.branding?.app_name && (
                <Badge variant="outline" className="text-xs">
                  Custom Branding
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Trial Info */}
        {tenant.status === 'trial' && tenant.trial_ends_at && (
          <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
            <div className="text-sm">
              <span className="font-medium text-yellow-800">Trial ends:</span>
              <span className="text-yellow-700 ml-2">{formatDate(tenant.trial_ends_at)}</span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-end space-x-2 pt-4">
        {onViewDetails && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewDetails(tenant)}
            className="flex items-center space-x-1"
          >
            <span>View</span>
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(tenant)}
          className="flex items-center space-x-1"
        >
          <Edit className="h-4 w-4" />
          <span>Edit</span>
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(tenant.id)}
          className="flex items-center space-x-1"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete</span>
        </Button>
      </CardFooter>
    </Card>
  );
};
