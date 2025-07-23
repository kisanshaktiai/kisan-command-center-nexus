
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, TrendingUp, Users, Crown, Calendar, MapPin, Edit, Trash2 } from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { TenantService } from '@/services/tenantService';
import { UsageMeter } from './UsageMeter';
import { TrendChart } from './TrendChart';
import { TenantMetrics } from '@/types/tenantView';

interface TenantMetricsCardProps {
  tenant: Tenant;
  metrics?: TenantMetrics;
  size: 'small' | 'large';
  onEdit: (tenant: Tenant) => void;
  onDelete: (tenantId: string) => void;
  onViewDetails: (tenant: Tenant) => void;
}

export const TenantMetricsCard: React.FC<TenantMetricsCardProps> = ({
  tenant,
  metrics,
  size,
  onEdit,
  onDelete,
  onViewDetails,
}) => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  if (size === 'small') {
    return (
      <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={() => onViewDetails(tenant)}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold truncate">
                  {tenant.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {tenant.slug}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Badge variant={TenantService.getStatusBadgeVariant(tenant.status)} className="text-xs">
                {tenant.status?.toUpperCase()}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center space-x-1">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span>{tenant.max_farmers || 'N/A'}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Crown className="h-3 w-3 text-muted-foreground" />
              <span className="capitalize">{tenant.type?.replace('_', ' ')}</span>
            </div>
          </div>

          <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(tenant);
                }}
                className="h-6 w-6 p-0"
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(tenant.id);
                }}
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer" onClick={() => onViewDetails(tenant)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                {tenant.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {tenant.slug}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Badge variant={TenantService.getStatusBadgeVariant(tenant.status)}>
              {tenant.status?.toUpperCase()}
            </Badge>
            <Badge variant={TenantService.getPlanBadgeVariant(tenant.subscription_plan)}>
              {TenantService.getPlanDisplayName(tenant.subscription_plan)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
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

        {/* Usage Metrics */}
        {metrics && (
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Usage & Limits
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <UsageMeter
                label="Farmers"
                current={metrics.usageMetrics.farmers.current}
                limit={metrics.usageMetrics.farmers.limit}
                showDetails={false}
              />
              <UsageMeter
                label="Dealers"
                current={metrics.usageMetrics.dealers.current}
                limit={metrics.usageMetrics.dealers.limit}
                showDetails={false}
              />
            </div>
          </div>
        )}

        {/* Growth Trends */}
        {metrics?.growthTrends && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Growth Trends</h4>
            <div className="grid grid-cols-2 gap-4">
              <TrendChart
                data={metrics.growthTrends.farmers}
                label="Farmer Growth"
                color="#10B981"
              />
              <TrendChart
                data={metrics.growthTrends.revenue}
                label="Revenue Growth"
                color="#3B82F6"
              />
            </div>
          </div>
        )}

        {/* Health Score */}
        {metrics?.healthScore !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Health Score</span>
              <Badge variant={metrics.healthScore >= 80 ? 'default' : metrics.healthScore >= 60 ? 'secondary' : 'destructive'}>
                {metrics.healthScore}/100
              </Badge>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(tenant);
            }}
            className="flex items-center space-x-1"
          >
            <Edit className="h-4 w-4" />
            <span>Edit</span>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(tenant.id);
            }}
            className="flex items-center space-x-1"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
