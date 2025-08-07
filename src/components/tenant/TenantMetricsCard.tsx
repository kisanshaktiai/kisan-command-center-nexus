import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Building2, Users, Zap, MoreVertical, Edit, Trash2, Eye, TrendingUp, AlertCircle } from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { TenantMetrics } from '@/types/tenantView';
import { UsageMeter } from './UsageMeter';
import { TrendChart } from './TrendChart';
import { TenantEmailActions } from './TenantEmailActions';

// Define interfaces and type definitions
interface UsageProps {
  current: number;
  limit: number;
}

interface GrowthTrendsProps {
  farmers: number[];
  revenue: number[];
  apiUsage: number[];
}

interface TenantMetricsProps {
  usageMetrics: {
    farmers: UsageProps;
    dealers: UsageProps;
    products: UsageProps;
    storage: UsageProps;
    apiCalls: UsageProps;
  };
  growthTrends: GrowthTrendsProps;
  healthScore: number;
  lastActivityDate: string;
}

interface TenantViewPreferences {
  mode: 'small-cards' | 'large-cards' | 'list' | 'analytics';
  density: 'comfortable' | 'compact';
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface TenantMetricsCardProps {
  tenant: Tenant;
  metrics?: TenantMetrics;
  size?: 'small' | 'large';
  onEdit: (tenant: Tenant) => void;
  onDelete: (tenantId: string) => void;
  onViewDetails: (tenant: Tenant) => void;
}

export const TenantMetricsCard: React.FC<TenantMetricsCardProps> = ({
  tenant,
  metrics,
  size = 'small',
  onEdit,
  onDelete,
  onViewDetails,
}) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-500';
      case 'trial': return 'bg-blue-500';
      case 'suspended': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getSubscriptionBadgeVariant = (plan: string) => {
    switch (plan) {
      case 'AI_Enterprise': return 'default';
      case 'Shakti_Growth': return 'secondary';
      case 'Kisan_Basic': return 'outline';
      default: return 'outline';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (size === 'small') {
    return (
      <Card className="h-full hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-lg font-semibold truncate">
                  {tenant.name}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(tenant.status)}`} />
                <span className="text-sm text-muted-foreground capitalize">
                  {tenant.status}
                </span>
                <Badge variant={getSubscriptionBadgeVariant(tenant.subscription_plan)} className="text-xs">
                  {tenant.subscription_plan.replace('_', ' ')}
                </Badge>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onViewDetails(tenant)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(tenant)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Tenant
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(tenant.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Tenant
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Usage Metrics */}
          {metrics?.usageMetrics && (
            <div className="space-y-3">
              <UsageMeter 
                label="Farmers" 
                value={metrics.usageMetrics.farmers.current} 
                max={metrics.usageMetrics.farmers.limit} 
                className="text-xs"
              />
              <UsageMeter 
                label="Storage" 
                value={metrics.usageMetrics.storage.current} 
                max={metrics.usageMetrics.storage.limit} 
                unit="GB"
                className="text-xs"
              />
            </div>
          )}

          {/* Tenant Info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Slug: <span className="font-mono">{tenant.slug}</span></div>
            <div>Created: {formatDate(tenant.created_at)}</div>
            {tenant.owner_email && (
              <div>Admin: {tenant.owner_email}</div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onViewDetails(tenant)}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-1" />
              Details
            </Button>
            <TenantEmailActions tenant={tenant} />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Large card layout with email actions
  return (
    <Card className="h-full hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <Building2 className="h-6 w-6 text-muted-foreground" />
              <CardTitle className="text-xl font-bold">
                {tenant.name}
              </CardTitle>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(tenant.status)}`} />
              <span className="text-sm font-medium capitalize">
                {tenant.status}
              </span>
              <Badge variant={getSubscriptionBadgeVariant(tenant.subscription_plan)}>
                {tenant.subscription_plan.replace('_', ' ')}
              </Badge>
              {metrics?.healthScore && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">
                    {metrics.healthScore}%
                  </span>
                </div>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onViewDetails(tenant)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(tenant)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Tenant
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(tenant.id)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Tenant
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Usage Metrics Grid */}
        {metrics?.usageMetrics && (
          <div className="grid grid-cols-2 gap-4">
            <UsageMeter 
              label="Farmers" 
              value={metrics.usageMetrics.farmers.current} 
              max={metrics.usageMetrics.farmers.limit} 
              showPercentage
            />
            <UsageMeter 
              label="Dealers" 
              value={metrics.usageMetrics.dealers.current} 
              max={metrics.usageMetrics.dealers.limit} 
              showPercentage
            />
            <UsageMeter 
              label="Storage" 
              value={metrics.usageMetrics.storage.current} 
              max={metrics.usageMetrics.storage.limit} 
              unit="GB"
              showPercentage
            />
            <UsageMeter 
              label="API Calls" 
              value={metrics.usageMetrics.apiCalls.current} 
              max={metrics.usageMetrics.apiCalls.limit} 
              showPercentage
            />
          </div>
        )}

        {/* Growth Trends */}
        {metrics?.growthTrends && (
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Growth Trends (7 days)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TrendChart 
                data={metrics.growthTrends.farmers} 
                label="Farmers" 
                color="hsl(var(--chart-1))"
              />
              <TrendChart 
                data={metrics.growthTrends.revenue} 
                label="Revenue" 
                color="hsl(var(--chart-2))" 
                prefix="₹"
              />
              <TrendChart 
                data={metrics.growthTrends.apiUsage} 
                label="API Usage" 
                color="hsl(var(--chart-3))"
              />
            </div>
          </div>
        )}

        {/* Tenant Details */}
        <div className="space-y-3 pt-4 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Slug:</span>
              <p className="font-mono mt-1">{tenant.slug}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Created:</span>
              <p className="mt-1">{formatDate(tenant.created_at)}</p>
            </div>
            {tenant.owner_email && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Admin Contact:</span>
                <p className="mt-1">{tenant.owner_email}</p>
                {tenant.owner_name && (
                  <p className="text-muted-foreground text-xs">{tenant.owner_name}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => onViewDetails(tenant)}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
          <TenantEmailActions tenant={tenant} />
          <Button 
            variant="outline" 
            onClick={() => onEdit(tenant)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
