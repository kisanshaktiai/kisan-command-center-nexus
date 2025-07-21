
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Activity, AlertTriangle, CheckCircle, Database, Server, Cpu, HardDrive, Network, Refresh, TrendingUp, Users, Zap } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SystemMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_unit: string;
  component_name: string;
  timestamp: string;
  severity_level: string;
}

interface PlatformAlert {
  id: string;
  alert_name: string;
  description: string;
  severity: string;
  status: string;
  component: string;
  triggered_at: string;
  resolved_at: string | null;
}

export default function PlatformMonitoring() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const queryClient = useQueryClient();

  // Fetch system metrics
  const { data: metrics = [], isLoading: metricsLoading } = useQuery({
    queryKey: ['system-metrics'],
    queryFn: async (): Promise<SystemMetric[]> => {
      const { data, error } = await supabase
        .from('system_metrics')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: autoRefresh ? 30000 : false, // Refresh every 30 seconds
  });

  // Fetch platform alerts
  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['platform-alerts'],
    queryFn: async (): Promise<PlatformAlert[]> => {
      const { data, error } = await supabase
        .from('platform_alerts')
        .select('*')
        .order('triggered_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Set up real-time subscriptions
  useEffect(() => {
    const metricsChannel = supabase
      .channel('system-metrics-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_metrics',
        },
        (payload) => {
          console.log('New system metric:', payload);
          queryClient.invalidateQueries({ queryKey: ['system-metrics'] });
          
          // Show alert for critical metrics
          if (payload.new.severity_level === 'critical') {
            toast.error(`Critical alert: ${payload.new.metric_name} - ${payload.new.metric_value}${payload.new.metric_unit}`);
          }
        }
      )
      .subscribe();

    const alertsChannel = supabase
      .channel('platform-alerts-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'platform_alerts',
        },
        (payload) => {
          console.log('Platform alert update:', payload);
          queryClient.invalidateQueries({ queryKey: ['platform-alerts'] });
          
          if (payload.eventType === 'INSERT') {
            toast.error(`New alert: ${payload.new.alert_name}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(metricsChannel);
      supabase.removeChannel(alertsChannel);
    };
  }, [queryClient]);

  // Transform metrics for charts
  const getMetricsByComponent = (componentName: string) => {
    return metrics
      .filter(m => m.component_name === componentName)
      .slice(0, 20)
      .reverse()
      .map(m => ({
        time: new Date(m.timestamp).toLocaleTimeString(),
        value: m.metric_value,
        unit: m.metric_unit,
      }));
  };

  const getCurrentMetrics = () => {
    const latest = metrics.reduce((acc, metric) => {
      if (!acc[metric.metric_name] || new Date(metric.timestamp) > new Date(acc[metric.metric_name].timestamp)) {
        acc[metric.metric_name] = metric;
      }
      return acc;
    }, {} as Record<string, SystemMetric>);

    return Object.values(latest);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'warning': return 'bg-yellow-500 text-white';
      case 'info': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getComponentIcon = (component: string) => {
    switch (component) {
      case 'database': return <Database className="h-5 w-5" />;
      case 'api_server': return <Server className="h-5 w-5" />;
      case 'storage': return <HardDrive className="h-5 w-5" />;
      case 'api_gateway': return <Network className="h-5 w-5" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('platform_alerts')
        .update({ status: 'acknowledged' })
        .eq('id', alertId);

      if (error) throw error;
      toast.success('Alert acknowledged');
    } catch (error: any) {
      toast.error('Failed to acknowledge alert');
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('platform_alerts')
        .update({ 
          status: 'resolved',
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;
      toast.success('Alert resolved');
    } catch (error: any) {
      toast.error('Failed to resolve alert');
    }
  };

  const currentMetrics = getCurrentMetrics();
  const activeAlerts = alerts.filter(alert => alert.status === 'active');
  const cpuData = getMetricsByComponent('api_server');
  const memoryData = getMetricsByComponent('database');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Platform Monitoring</h1>
          <p className="text-muted-foreground">Real-time system health and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="flex items-center gap-2"
          >
            <Refresh className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh {autoRefresh ? 'On' : 'Off'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['system-metrics'] });
              queryClient.invalidateQueries({ queryKey: ['platform-alerts'] });
            }}
          >
            Refresh Now
          </Button>
        </div>
      </div>

      {/* System Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {currentMetrics.map((metric) => (
          <Card key={metric.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.metric_name}</CardTitle>
              {getComponentIcon(metric.component_name)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metric.metric_value}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  {metric.metric_unit}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={getSeverityColor(metric.severity_level)}>
                  {metric.severity_level}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {metric.component_name}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metrics">System Metrics</TabsTrigger>
          <TabsTrigger value="alerts" className="relative">
            Platform Alerts
            {activeAlerts.length > 0 && (
              <Badge className="ml-2 bg-red-500 text-white px-1 py-0 text-xs">
                {activeAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="performance">Performance Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  API Server Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={cpuData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Memory Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={memoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Active Alerts ({activeAlerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                      <div>
                        <h4 className="font-medium">{alert.alert_name}</h4>
                        <p className="text-sm text-muted-foreground">{alert.description}</p>
                        <div className="text-xs text-muted-foreground mt-1">
                          {alert.component} • Triggered {new Date(alert.triggered_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        Acknowledge
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => resolveAlert(alert.id)}
                      >
                        Resolve
                      </Button>
                    </div>
                  </div>
                ))}

                {activeAlerts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p>No active alerts. System is running smoothly!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  System Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={currentMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="metric_name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="metric_value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
