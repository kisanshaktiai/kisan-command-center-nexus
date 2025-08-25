
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Users, Zap, HardDrive, Globe, AlertTriangle } from 'lucide-react';

interface RealTimeMetrics {
  current_metrics: {
    active_users: number;
    api_calls_last_hour: number;
    error_rate: number;
    response_time_avg: number;
    storage_usage_mb: number;
    bandwidth_usage_mb: number;
  };
  health_indicators: {
    system_health: 'healthy' | 'warning' | 'critical';
    database_health: 'healthy' | 'warning' | 'critical';
    api_health: 'healthy' | 'warning' | 'critical';
    storage_health: 'healthy' | 'warning' | 'critical';
  };
  alerts: Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: string;
    resolved: boolean;
  }>;
}

interface RealTimeMetricsWidgetProps {
  tenantId: string;
}

export const RealTimeMetricsWidget: React.FC<RealTimeMetricsWidgetProps> = ({ tenantId }) => {
  const [metrics, setMetrics] = useState<RealTimeMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchMetrics = async () => {
    if (!tenantId) {
      console.warn('[RealTimeMetricsWidget] No tenant ID provided');
      setError('No tenant ID provided');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      console.log(`[RealTimeMetricsWidget] Fetching metrics for tenant: ${tenantId}`);
      
      const { data, error } = await supabase.functions.invoke('tenant-real-time-metrics', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }, {
        // Pass tenant_id as query parameter
        query: { tenant_id: tenantId }
      });

      if (error) {
        console.error('[RealTimeMetricsWidget] Error fetching metrics:', error);
        throw error;
      }

      console.log(`[RealTimeMetricsWidget] Successfully fetched metrics for tenant ${tenantId}`);
      setMetrics(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('[RealTimeMetricsWidget] Error in fetchMetrics:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!tenantId) return;
    
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [tenantId]);

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAlertVariant = (type: string) => {
    switch (type) {
      case 'error': return 'destructive';
      case 'warning': return 'default';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load real-time metrics: {error}
          <button 
            onClick={fetchMetrics}
            className="ml-2 underline hover:no-underline"
          >
            Retry
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!metrics) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>No metrics data available for this tenant.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Real-time Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.current_metrics.active_users}</div>
            <p className="text-xs text-muted-foreground">Currently online</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">API Calls</CardTitle>
              <Activity className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.current_metrics.api_calls_last_hour}</div>
            <p className="text-xs text-muted-foreground">Last hour</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Response Time</CardTitle>
              <Zap className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.current_metrics.response_time_avg.toFixed(0)}ms</div>
            <p className="text-xs text-muted-foreground">Average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Storage Usage</CardTitle>
              <HardDrive className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics.current_metrics.storage_usage_mb / 1024).toFixed(1)}GB</div>
            <p className="text-xs text-muted-foreground">Current usage</p>
          </CardContent>
        </Card>
      </div>

      {/* Health Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-sm font-medium mb-2">System</div>
              <Badge className={getHealthColor(metrics.health_indicators.system_health)}>
                {metrics.health_indicators.system_health}
              </Badge>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium mb-2">Database</div>
              <Badge className={getHealthColor(metrics.health_indicators.database_health)}>
                {metrics.health_indicators.database_health}
              </Badge>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium mb-2">API</div>
              <Badge className={getHealthColor(metrics.health_indicators.api_health)}>
                {metrics.health_indicators.api_health}
              </Badge>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium mb-2">Storage</div>
              <Badge className={getHealthColor(metrics.health_indicators.storage_health)}>
                {metrics.health_indicators.storage_health}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      {metrics.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.alerts.map((alert) => (
                <Alert key={alert.id} variant={getAlertVariant(alert.type)}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex justify-between items-start">
                      <span>{alert.message}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Updated */}
      <div className="text-center text-xs text-muted-foreground">
        Last updated: {lastUpdated.toLocaleTimeString()}
      </div>
    </div>
  );
};
