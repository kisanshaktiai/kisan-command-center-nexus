
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { 
  Building2, 
  Edit, 
  Trash2, 
  Eye, 
  Users, 
  MapPin,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { FormattedTenantData } from '@/services/TenantDisplayService';
import { TenantMetrics } from '@/types/tenantView';
import { UsageMeter } from './UsageMeter';
import { TrendChart } from './TrendChart';

interface TenantCardRefactoredProps {
  tenant: Tenant;
  formattedData: FormattedTenantData;
  size?: 'small' | 'large' | 'analytics';
  metrics?: TenantMetrics;
  showAnalytics?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onViewDetails: () => void;
}

export const TenantCardRefactored: React.FC<TenantCardRefactoredProps> = ({
  tenant,
  formattedData,
  size = 'small',
  metrics,
  showAnalytics = false,
  onEdit,
  onDelete,
  onViewDetails
}) => {
  const isLarge = size === 'large';
  const isAnalytics = size === 'analytics' || showAnalytics;

  return (
    <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
      <CardHeader className={`pb-3 ${isLarge ? 'p-6' : 'p-4'}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 bg-primary/10 rounded-lg ${isLarge ? 'p-3' : ''}`}>
              <Building2 className={`text-primary ${isLarge ? 'h-6 w-6' : 'h-5 w-5'}`} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className={`font-semibold truncate ${isLarge ? 'text-lg' : 'text-base'}`}>
                {formattedData.name}
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                {formattedData.slug}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant={formattedData.statusBadgeVariant as any} className="text-xs">
              {formattedData.displayStatus}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className={`space-y-4 ${isLarge ? 'px-6' : 'px-4'}`}>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Type</span>
            <span className="font-medium">{formattedData.displayType}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Plan</span>
            <Badge variant={formattedData.planBadgeVariant as any} className="text-xs">
              {formattedData.planDisplayName}
            </Badge>
          </div>

          {isLarge && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Owner</span>
                <span className="font-medium truncate ml-2">{formattedData.ownerName}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">{formattedData.formattedCreatedAt}</span>
              </div>
            </>
          )}
        </div>

        {/* Usage Metrics */}
        {metrics && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Usage Overview</h4>
            <div className="space-y-1">
              <UsageMeter
                label="Farmers"
                current={metrics.usageMetrics.farmers.current}
                limit={metrics.usageMetrics.farmers.limit}
                showDetails={isLarge}
              />
              {isLarge && (
                <>
                  <UsageMeter
                    label="Dealers"
                    current={metrics.usageMetrics.dealers.current}
                    limit={metrics.usageMetrics.dealers.limit}
                    showDetails={true}
                  />
                  <UsageMeter
                    label="Storage"
                    current={metrics.usageMetrics.storage.current}
                    limit={metrics.usageMetrics.storage.limit}
                    showDetails={true}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* Analytics */}
        {isAnalytics && metrics && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Growth Trends
            </h4>
            <TrendChart 
              data={metrics.growthTrends.farmers}
              height={60}
              color="hsl(var(--primary))"
            />
          </div>
        )}
      </CardContent>

      <CardFooter className={`pt-0 ${isLarge ? 'px-6 pb-6' : 'px-4 pb-4'}`}>
        <div className="flex w-full space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onViewDetails}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="flex-1"
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          {isLarge && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};
