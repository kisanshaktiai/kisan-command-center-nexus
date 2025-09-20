import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Server, Database, Globe, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { usePlatformMonitoringRealtime } from '@/hooks/usePlatformMonitoringRealtime';
import { SparklineChart } from './SparklineChart';
import { AnimatedDelta } from './AnimatedDelta';
import { RealtimeIndicator } from './RealtimeIndicator';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DataGeneratorButton } from './DataGeneratorButton';

interface Props {
  tenantId?: string;
}

export const EnhancedPlatformMonitoringContainer: React.FC<Props> = ({ tenantId }) => {
  const { 
    monitoringData, 
    isLoading, 
    error, 
    refetch, 
    isRealtimeConnected, 
    lastRealtimeUpdate 
  } = usePlatformMonitoringRealtime(tenantId);

  const [previousData, setPreviousData] = useState(monitoringData);

  // Update previous data for delta calculations
  React.useEffect(() => {
    if (monitoringData && JSON.stringify(monitoringData) !== JSON.stringify(previousData)) {
      const timer = setTimeout(() => setPreviousData(monitoringData), 100);
      return () => clearTimeout(timer);
    }
  }, [monitoringData, previousData]);

  if (error) {
    return (
      <Alert className="m-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Failed to load monitoring data. Using fallback data.</span>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-success';
      case 'warning': return 'text-warning';
      case 'critical': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy': return 'default';
      case 'warning': return 'secondary';
      case 'critical': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Platform Monitoring</h1>
          <p className="text-muted-foreground mt-1">Real-time system performance and analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <DataGeneratorButton />
          <RealtimeIndicator 
            isConnected={isRealtimeConnected} 
            lastUpdate={lastRealtimeUpdate || undefined}
          />
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Card */}
      <Card className="relative overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              System Health
            </CardTitle>
            <Badge variant={getStatusBadge(monitoringData.systemHealth.status) as any}>
              {monitoringData.systemHealth.status === 'healthy' && <CheckCircle className="h-3 w-3 mr-1" />}
              {monitoringData.systemHealth.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CPU Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">CPU Usage</span>
                <AnimatedDelta
                  value={monitoringData.systemHealth.cpuUsage}
                  previousValue={previousData?.systemHealth.cpuUsage}
                  format="percent"
                />
              </div>
              <Progress 
                value={monitoringData.systemHealth.cpuUsage} 
                className="h-2"
              />
              <SparklineChart
                data={monitoringData.systemHealth.history?.cpuUsage || []}
                color="hsl(var(--primary))"
                width={120}
                height={40}
              />
            </div>

            {/* Memory Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Memory Usage</span>
                <AnimatedDelta
                  value={monitoringData.systemHealth.memoryUsage}
                  previousValue={previousData?.systemHealth.memoryUsage}
                  format="percent"
                />
              </div>
              <Progress 
                value={monitoringData.systemHealth.memoryUsage} 
                className="h-2"
              />
              <SparklineChart
                data={monitoringData.systemHealth.history?.memoryUsage || []}
                color="hsl(var(--warning))"
                width={120}
                height={40}
              />
            </div>

            {/* Disk Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Disk Usage</span>
                <AnimatedDelta
                  value={monitoringData.systemHealth.diskUsage}
                  previousValue={previousData?.systemHealth.diskUsage}
                  format="percent"
                />
              </div>
              <Progress 
                value={monitoringData.systemHealth.diskUsage} 
                className="h-2"
              />
              <SparklineChart
                data={monitoringData.systemHealth.history?.diskUsage || []}
                color="hsl(var(--info))"
                width={120}
                height={40}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div>
              <p className="text-sm text-muted-foreground">Uptime</p>
              <p className="text-lg font-semibold">{monitoringData.systemHealth.uptime}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Users</p>
              <AnimatedDelta
                value={monitoringData.systemHealth.activeUsers}
                previousValue={previousData?.systemHealth.activeUsers}
                format="number"
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Health Score</p>
              <p className={`text-lg font-semibold ${getStatusColor(monitoringData.systemHealth.status)}`}>
                {monitoringData.systemHealth.healthScore}/100
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">DB Connections</p>
              <p className="text-lg font-semibold">{monitoringData.resourceMetrics.databaseConnections}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Performance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            API Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Requests</p>
              <AnimatedDelta
                value={monitoringData.apiMetrics.totalRequests}
                previousValue={previousData?.apiMetrics.totalRequests}
                format="number"
              />
              <SparklineChart
                data={Array.from({ length: 10 }, () => Math.random() * 1000)}
                color="hsl(var(--primary))"
                width={80}
                height={30}
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Success Rate</p>
              <AnimatedDelta
                value={monitoringData.apiMetrics.successRate}
                previousValue={previousData?.apiMetrics.successRate}
                format="percent"
              />
              <Progress value={monitoringData.apiMetrics.successRate} className="h-1.5 mt-2" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Avg Response Time</p>
              <AnimatedDelta
                value={monitoringData.apiMetrics.avgResponseTime}
                previousValue={previousData?.apiMetrics.avgResponseTime}
                suffix="ms"
              />
              <SparklineChart
                data={monitoringData.apiMetrics.latencyHistory || []}
                color="hsl(var(--warning))"
                width={80}
                height={30}
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Requests/min</p>
              <AnimatedDelta
                value={monitoringData.apiMetrics.requestsPerMinute}
                previousValue={previousData?.apiMetrics.requestsPerMinute}
                format="number"
              />
            </div>
          </div>

          {/* Top Endpoints */}
          <div className="pt-2">
            <h4 className="text-sm font-medium mb-2">Top Endpoints</h4>
            <div className="space-y-1">
              {monitoringData.apiMetrics.topEndpoints.map((endpoint, idx) => (
                <div key={endpoint.endpoint} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate max-w-[200px]">
                    {idx + 1}. {endpoint.endpoint}
                  </span>
                  <div className="flex items-center gap-3">
                    <span>{endpoint.count} calls</span>
                    <Badge variant="outline" className="text-xs">
                      {endpoint.avgTime.toFixed(0)}ms
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Metrics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Financial Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Monthly Revenue</p>
              <AnimatedDelta
                value={monitoringData.financialMetrics.monthlyRevenue}
                previousValue={previousData?.financialMetrics.monthlyRevenue}
                format="currency"
              />
              <SparklineChart
                data={monitoringData.financialMetrics.revenueHistory || []}
                color="hsl(var(--success))"
                width={80}
                height={30}
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">MRR Growth</p>
              <AnimatedDelta
                value={monitoringData.financialMetrics.mrrGrowth}
                previousValue={previousData?.financialMetrics.mrrGrowth}
                format="percent"
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Subscriptions</p>
              <AnimatedDelta
                value={monitoringData.financialMetrics.totalSubscriptions}
                previousValue={previousData?.financialMetrics.totalSubscriptions}
                format="number"
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">ARPU</p>
              <AnimatedDelta
                value={monitoringData.financialMetrics.arpu}
                previousValue={previousData?.financialMetrics.arpu}
                format="currency"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resource Utilization */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Resource Utilization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">API Calls</span>
                  <span className="text-sm text-muted-foreground">
                    {monitoringData.resourceMetrics.apiCalls.toLocaleString()} / {monitoringData.resourceMetrics.maxLimits.apiCalls.toLocaleString()}
                  </span>
                </div>
                <Progress 
                  value={(monitoringData.resourceMetrics.apiCalls / monitoringData.resourceMetrics.maxLimits.apiCalls) * 100} 
                  className="h-2"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Storage</span>
                  <span className="text-sm text-muted-foreground">
                    {monitoringData.resourceMetrics.storageUsed} GB / {monitoringData.resourceMetrics.maxLimits.storage} GB
                  </span>
                </div>
                <Progress 
                  value={(monitoringData.resourceMetrics.storageUsed / monitoringData.resourceMetrics.maxLimits.storage) * 100} 
                  className="h-2"
                />
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Bandwidth</span>
                  <span className="text-sm text-muted-foreground">
                    {monitoringData.resourceMetrics.bandwidthUsed} GB / {monitoringData.resourceMetrics.maxLimits.bandwidth} GB
                  </span>
                </div>
                <Progress 
                  value={(monitoringData.resourceMetrics.bandwidthUsed / monitoringData.resourceMetrics.maxLimits.bandwidth) * 100} 
                  className="h-2"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">DB Connections</span>
                  <span className="text-sm text-muted-foreground">
                    {monitoringData.resourceMetrics.databaseConnections} / {monitoringData.resourceMetrics.maxLimits.connections}
                  </span>
                </div>
                <Progress 
                  value={(monitoringData.resourceMetrics.databaseConnections / monitoringData.resourceMetrics.maxLimits.connections) * 100} 
                  className="h-2"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};