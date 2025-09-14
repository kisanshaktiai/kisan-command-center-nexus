
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, RefreshCw, AlertCircle } from 'lucide-react';

interface RealTimeMetricsWidgetProps {
  tenantId: string;
  onRefresh?: () => void;
}

export const RealTimeMetricsWidget: React.FC<RealTimeMetricsWidgetProps> = ({
  tenantId,
  onRefresh
}) => {
  const [metrics, setMetrics] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const fetchMetrics = React.useCallback(async () => {
    if (!tenantId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('RealTimeMetricsWidget: Fetching metrics for tenant:', tenantId);
      
      // Import supabase client
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error: fetchError } = await supabase.functions.invoke(
        'tenant-real-time-metrics',
        {
          method: 'GET'
        }
      );
      
      if (fetchError) {
        console.error('RealTimeMetricsWidget: Error fetching metrics:', fetchError);
        setError(fetchError);
        return;
      }

      console.log('RealTimeMetricsWidget: Metrics data received:', data);
      setMetrics(data);
    } catch (err) {
      console.error('RealTimeMetricsWidget: Unexpected error:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  React.useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handleRefresh = () => {
    fetchMetrics();
    onRefresh?.();
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-red-500" />
            Metrics Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            Failed to load real-time metrics
          </p>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-green-500" />
            Live Metrics
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading metrics...</span>
          </div>
        ) : metrics ? (
          <div className="space-y-2">
            <Badge variant="secondary" className="text-xs">
              Real-time data available
            </Badge>
            <p className="text-xs text-muted-foreground">
              Metrics loaded successfully
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No metrics available
          </p>
        )}
      </CardContent>
    </Card>
  );
};
