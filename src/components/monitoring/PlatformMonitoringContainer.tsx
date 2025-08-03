
import React from 'react';
import { usePlatformMonitoring } from '@/hooks/usePlatformMonitoring';
import { SystemHealthDisplay } from './SystemHealthDisplay';
import { ResourceMetricsDisplay } from './ResourceMetricsDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, AlertCircle } from 'lucide-react';

export const PlatformMonitoringContainer: React.FC = () => {
  const { data: monitoringData, isLoading, error, refetch } = usePlatformMonitoring();

  const handleRefresh = () => {
    refetch();
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load monitoring data: {error.message}</span>
          </div>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm" 
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Platform Monitoring</h2>
          <p className="text-muted-foreground">Real-time system health and performance metrics</p>
        </div>
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          size="sm"
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* System Health */}
      <div>
        <h3 className="text-lg font-semibold mb-4">System Health</h3>
        <SystemHealthDisplay 
          systemHealth={monitoringData?.systemHealth || {
            cpuUsage: 0,
            memoryUsage: 0,
            diskUsage: 0,
            healthScore: 0,
          }}
          isLoading={isLoading}
        />
      </div>

      {/* Resource Metrics */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Resource Utilization</h3>
        <ResourceMetricsDisplay 
          resourceMetrics={monitoringData?.resourceMetrics || {
            storageUsed: 0,
            storageTotal: 0,
            databaseConnections: 0,
            activeUsers: 0,
          }}
          isLoading={isLoading}
        />
      </div>

      {/* API & Financial Metrics */}
      {monitoringData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                API Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Calls (24h)</span>
                  <span className="font-semibold">{monitoringData.apiMetrics.totalCalls.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Error Rate</span>
                  <span className={`font-semibold ${monitoringData.apiMetrics.errorRate > 5 ? 'text-red-600' : 'text-green-600'}`}>
                    {monitoringData.apiMetrics.errorRate.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg Response Time</span>
                  <span className="font-semibold">{monitoringData.apiMetrics.avgResponseTime.toFixed(0)}ms</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Financial Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Monthly Revenue</span>
                  <span className="font-semibold">${monitoringData.financialMetrics.monthlyRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Active Subscriptions</span>
                  <span className="font-semibold">{monitoringData.financialMetrics.activeSubscriptions}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Churn Rate</span>
                  <span className={`font-semibold ${monitoringData.financialMetrics.churnRate > 5 ? 'text-red-600' : 'text-green-600'}`}>
                    {monitoringData.financialMetrics.churnRate}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
