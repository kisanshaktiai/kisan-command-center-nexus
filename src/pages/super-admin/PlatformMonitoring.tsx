
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  Server, 
  Users, 
  DollarSign,
  Brain,
  Settings,
  Download
} from 'lucide-react';
import SystemHealthMonitor from '@/components/monitoring/SystemHealthMonitor';
import UsageAnalytics from '@/components/monitoring/UsageAnalytics';
import AIModelMonitoring from '@/components/monitoring/AIModelMonitoring';
import FinancialAnalytics from '@/components/monitoring/FinancialAnalytics';
import PredictiveInsights from '@/components/monitoring/PredictiveInsights';
import CustomDashboard from '@/components/monitoring/CustomDashboard';
import AlertsPanel from '@/components/monitoring/AlertsPanel';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const PlatformMonitoring = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  // Real-time alerts subscription
  useEffect(() => {
    const channel = supabase
      .channel('platform-alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'platform_alerts'
        },
        (payload) => {
          console.log('Alert update:', payload);
          // Trigger alert notifications
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Get overall platform statistics
  const { data: platformStats, isLoading: statsLoading } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      const [
        systemMetrics,
        activeAlerts,
        usageData,
        financialData
      ] = await Promise.all([
        supabase.from('system_metrics').select('*').order('timestamp', { ascending: false }).limit(100),
        supabase.from('platform_alerts').select('*').eq('status', 'active'),
        supabase.from('usage_analytics').select('*').order('timestamp', { ascending: false }).limit(100),
        supabase.from('financial_metrics').select('*').order('timestamp', { ascending: false }).limit(50)
      ]);

      return {
        systemMetrics: systemMetrics.data || [],
        activeAlerts: activeAlerts.data || [],
        usageData: usageData.data || [],
        financialData: financialData.data || []
      };
    },
    refetchInterval: refreshInterval,
  });

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">98.5%</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              +0.2% from last hour
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {platformStats?.activeAlerts?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {platformStats?.activeAlerts?.filter(a => a.severity === 'critical').length || 0} critical
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              +8% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$45,231</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              +12% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {platformStats?.activeAlerts && platformStats.activeAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {platformStats.activeAlerts.slice(0, 5).map((alert) => (
                <Alert key={alert.id}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <div>
                      <strong>{alert.alert_name}</strong>: {alert.description}
                    </div>
                    <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                      {alert.severity}
                    </Badge>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common monitoring and management tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Metrics
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Configure Alerts
            </Button>
            <Button variant="outline" size="sm">
              <Activity className="w-4 h-4 mr-2" />
              System Health Check
            </Button>
            <Button variant="outline" size="sm">
              <Brain className="w-4 h-4 mr-2" />
              Model Performance
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Monitoring</h1>
          <p className="text-muted-foreground">
            Comprehensive monitoring and analytics for platform health and performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-green-600">
            <Activity className="w-3 h-3 mr-1" />
            System Healthy
          </Badge>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
          <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
          <TabsTrigger value="ai-models">AI Models</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {renderOverview()}
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <SystemHealthMonitor refreshInterval={refreshInterval} />
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <UsageAnalytics refreshInterval={refreshInterval} />
        </TabsContent>

        <TabsContent value="ai-models" className="space-y-6">
          <AIModelMonitoring refreshInterval={refreshInterval} />
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <FinancialAnalytics refreshInterval={refreshInterval} />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <PredictiveInsights />
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-6">
          <CustomDashboard />
        </TabsContent>
      </Tabs>

      {/* Floating Alerts Panel */}
      <AlertsPanel />
    </div>
  );
};

export default PlatformMonitoring;
