import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  Activity, 
  Server, 
  TrendingUp, 
  Users, 
  Database,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap
} from 'lucide-react';
import { useRealPlatformMonitoring } from '@/hooks/useRealPlatformMonitoring';
import { DataGeneratorButton } from './DataGeneratorButton';

export const RealPlatformMonitoringDashboard = () => {
  const { metrics, isLoading, error, refetch, isRealtimeConnected } = useRealPlatformMonitoring();

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load monitoring data: {error.message}
          <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-4">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading || !metrics) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-1/3"></div>
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'healthy':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'critical':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Platform Monitoring</h1>
          <p className="text-muted-foreground mt-2">
            Real-time system health, API performance, and platform metrics
          </p>
        </div>
        <div className="flex items-center gap-4">
          {isRealtimeConnected && (
            <Badge variant="default" className="gap-2">
              <Zap className="h-3 w-3" />
              Live
            </Badge>
          )}
          <DataGeneratorButton />
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-6">
      {/* Platform Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Users className="h-8 w-8 text-muted-foreground" />
              <div className="text-right">
                <p className="text-2xl font-bold">{metrics.platformStats.activeTenants}</p>
                <p className="text-sm text-muted-foreground">Active Tenants</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Users className="h-8 w-8 text-muted-foreground" />
              <div className="text-right">
                <p className="text-2xl font-bold">{metrics.platformStats.activeFarmers}</p>
                <p className="text-sm text-muted-foreground">Farmers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Users className="h-8 w-8 text-muted-foreground" />
              <div className="text-right">
                <p className="text-2xl font-bold">{metrics.platformStats.activeDealers}</p>
                <p className="text-sm text-muted-foreground">Dealers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Activity className="h-8 w-8 text-muted-foreground" />
              <div className="text-right">
                <p className="text-2xl font-bold">{metrics.platformStats.activeUsers}</p>
                <p className="text-sm text-muted-foreground">Active Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Database className="h-8 w-8 text-muted-foreground" />
              <div className="text-right">
                <p className="text-2xl font-bold">{metrics.platformStats.activeSessions}</p>
                <p className="text-sm text-muted-foreground">Live Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Server className="h-5 w-5" />
              <div>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Real-time resource utilization</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(metrics.systemHealth.status)}
              <Badge variant={getStatusVariant(metrics.systemHealth.status)}>
                {metrics.systemHealth.status}
              </Badge>
              <Badge variant="outline">
                Score: {metrics.systemHealth.healthScore}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">CPU Usage</span>
                <span className="text-sm text-muted-foreground">{metrics.systemHealth.cpuUsage.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.systemHealth.cpuUsage} />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Memory Usage</span>
                <span className="text-sm text-muted-foreground">{metrics.systemHealth.memoryUsage.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.systemHealth.memoryUsage} />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Disk Usage</span>
                <span className="text-sm text-muted-foreground">{metrics.systemHealth.diskUsage.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.systemHealth.diskUsage} />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Uptime</p>
                <p className="text-2xl font-bold">{metrics.systemHealth.uptime}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Health Score</p>
                <p className="text-2xl font-bold">{metrics.systemHealth.healthScore}/100</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Performance & Resource Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5" />
              <div>
                <CardTitle>API Performance</CardTitle>
                <CardDescription>Request metrics and latency</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Requests</p>
                  <p className="text-2xl font-bold">{metrics.apiMetrics.totalRequests.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">{metrics.apiMetrics.successRate}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Response</p>
                  <p className="text-2xl font-bold">{metrics.apiMetrics.avgResponseTime}ms</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Requests/min</p>
                  <p className="text-2xl font-bold">{metrics.apiMetrics.requestsPerMinute}</p>
                </div>
              </div>
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-3">Top Endpoints</h4>
                <div className="space-y-2">
                  {metrics.apiMetrics.topEndpoints.map((endpoint, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground truncate flex-1">{endpoint.endpoint}</span>
                      <Badge variant="outline" className="ml-2">{endpoint.count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5" />
              <div>
                <CardTitle>Resource Usage</CardTitle>
                <CardDescription>Platform resource consumption</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">API Calls</span>
                  <span className="text-sm text-muted-foreground">
                    {metrics.resourceUsage.apiCalls.current.toLocaleString()} / {metrics.resourceUsage.apiCalls.limit.toLocaleString()}
                  </span>
                </div>
                <Progress value={metrics.resourceUsage.apiCalls.percentage} />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Storage</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(metrics.resourceUsage.storage.current)} GB / {Math.round(metrics.resourceUsage.storage.limit)} GB
                  </span>
                </div>
                <Progress value={metrics.resourceUsage.storage.percentage} />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Bandwidth</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(metrics.resourceUsage.bandwidth.current)} GB / {Math.round(metrics.resourceUsage.bandwidth.limit)} GB
                  </span>
                </div>
                <Progress value={metrics.resourceUsage.bandwidth.percentage} />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">DB Connections</span>
                  <span className="text-sm text-muted-foreground">
                    {metrics.resourceUsage.connections.current} / {metrics.resourceUsage.connections.limit}
                  </span>
                </div>
                <Progress value={metrics.resourceUsage.connections.percentage} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Metrics */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5" />
            <div>
              <CardTitle>Financial Overview</CardTitle>
              <CardDescription>Revenue and subscription metrics</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Monthly Revenue</p>
              <p className="text-2xl font-bold">₹{metrics.financialMetrics.monthlyRevenue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">MRR Growth</p>
              <p className={`text-2xl font-bold ${metrics.financialMetrics.mrrGrowth >= 0 ? 'text-success' : 'text-destructive'}`}>
                {metrics.financialMetrics.mrrGrowth >= 0 ? '+' : ''}{metrics.financialMetrics.mrrGrowth.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Subscriptions</p>
              <p className="text-2xl font-bold">{metrics.financialMetrics.totalSubscriptions}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ARPU</p>
              <p className="text-2xl font-bold">₹{metrics.financialMetrics.arpu.toFixed(0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </>
  );
};
