
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TenantMetrics } from '@/types/tenantView';
import { Tenant } from '@/types/tenant';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface TenantMetricsCardProps {
  tenant: Tenant;
  metrics: TenantMetrics | null;
  isLoading: boolean;
  hasError: boolean;
  retryCount: number;
  onRetry: () => void;
}

export const TenantMetricsCard: React.FC<TenantMetricsCardProps> = ({
  tenant,
  metrics,
  isLoading,
  hasError,
  retryCount,
  onRetry
}) => {
  const renderMetricRow = (label: string, current: number, limit: number, percentage: number) => (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {hasError ? '—' : `${current.toLocaleString()} / ${limit.toLocaleString()}`}
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${
            hasError ? 'bg-muted-foreground/30' : 
            percentage >= 90 ? 'bg-destructive' : 
            percentage >= 75 ? 'bg-warning' : 'bg-primary'
          }`}
          style={{ width: hasError ? '0%' : `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{hasError ? '—' : `${percentage.toFixed(1)}%`}</span>
        <Badge variant={
          hasError ? 'secondary' :
          percentage >= 90 ? 'destructive' : 
          percentage >= 75 ? 'default' : 'secondary'
        }>
          {hasError ? 'Unavailable' :
           percentage >= 90 ? 'Critical' : 
           percentage >= 75 ? 'Warning' : 'Healthy'}
        </Badge>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-32" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              hasError ? 'bg-muted-foreground' :
              metrics?.healthScore && metrics.healthScore >= 80 ? 'bg-green-500' :
              metrics?.healthScore && metrics.healthScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <span className="text-sm font-medium">{tenant.name}</span>
          </div>
          {hasError && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRetry}
              disabled={isLoading}
              className="h-7"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Metrics unavailable. Please retry.
              {retryCount > 0 && (
                <span className="text-xs block mt-1">
                  Failed attempts: {retryCount}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {metrics ? (
          <>
            {renderMetricRow(
              'Farmers',
              metrics.usageMetrics.farmers.current,
              metrics.usageMetrics.farmers.limit,
              metrics.usageMetrics.farmers.percentage
            )}
            {renderMetricRow(
              'Dealers',
              metrics.usageMetrics.dealers.current,
              metrics.usageMetrics.dealers.limit,
              metrics.usageMetrics.dealers.percentage
            )}
            {renderMetricRow(
              'Storage (GB)',
              metrics.usageMetrics.storage.current,
              metrics.usageMetrics.storage.limit,
              metrics.usageMetrics.storage.percentage
            )}
            {renderMetricRow(
              'API Calls',
              metrics.usageMetrics.apiCalls.current,
              metrics.usageMetrics.apiCalls.limit,
              metrics.usageMetrics.apiCalls.percentage
            )}
          </>
        ) : hasError ? (
          <div className="space-y-4">
            {renderMetricRow('Farmers', 0, 1000, 0)}
            {renderMetricRow('Dealers', 0, 50, 0)}
            {renderMetricRow('Storage (GB)', 0, 10, 0)}
            {renderMetricRow('API Calls', 0, 10000, 0)}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
