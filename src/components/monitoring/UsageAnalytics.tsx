
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Activity, 
  TrendingUp, 
  Globe, 
  Clock,
  BarChart3
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface UsageAnalyticsProps {
  refreshInterval: number;
}

const UsageAnalytics: React.FC<UsageAnalyticsProps> = ({ refreshInterval }) => {
  const [timeRange, setTimeRange] = useState('24h');

  const { data: usageData, isLoading } = useQuery({
    queryKey: ['usage-analytics', timeRange],
    queryFn: async () => {
      const hoursBack = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
      const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

      const { data: apiLogs, error: logsError } = await supabase
        .from('api_logs')
        .select('*')
        .gte('created_at', startTime)
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;

      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('status', 'active');

      if (tenantError) throw tenantError;

      return {
        apiLogs: apiLogs || [],
        tenants: tenantData || []
      };
    },
    refetchInterval: refreshInterval,
  });

  const { data: metricsData } = useQuery({
    queryKey: ['usage-metrics', timeRange],
    queryFn: async () => {
      const hoursBack = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
      const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

      const { data: aiMetrics, error } = await supabase
        .from('ai_model_metrics')
        .select('*')
        .gte('timestamp', startTime);

      if (error) throw error;

      return aiMetrics || [];
    },
    refetchInterval: refreshInterval,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-40 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalRequests = usageData?.apiLogs?.length || 0;
  const uniqueTenants = new Set(usageData?.apiLogs?.map(log => log.tenant_id)).size;
  const avgResponseTime = usageData?.apiLogs?.reduce((sum, log) => 
    sum + (log.response_time_ms || 0), 0) / totalRequests || 0;
  const errorRate = usageData?.apiLogs?.filter(log => 
    log.status_code >= 400).length / totalRequests * 100 || 0;

  const endpointStats = usageData?.apiLogs?.reduce((acc, log) => {
    const key = log.endpoint;
    if (!acc[key]) {
      acc[key] = { requests: 0, avgTime: 0, errors: 0 };
    }
    acc[key].requests++;
    acc[key].avgTime = (acc[key].avgTime + (log.response_time_ms || 0)) / acc[key].requests;
    if (log.status_code >= 400) acc[key].errors++;
    return acc;
  }, {} as Record<string, any>) || {};

  const chartData = Object.entries(endpointStats).slice(0, 10).map(([endpoint, stats]) => ({
    endpoint: endpoint.split('/').pop() || endpoint,
    requests: stats.requests,
    avgTime: Math.round(stats.avgTime)
  }));

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Usage Analytics</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">API calls processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueTenants}</div>
            <p className="text-xs text-muted-foreground">Unique tenant requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(avgResponseTime)}ms</div>
            <p className="text-xs text-muted-foreground">Average API response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">Failed requests</p>
          </CardContent>
        </Card>
      </div>

      {/* API Endpoints Performance */}
      <Card>
        <CardHeader>
          <CardTitle>API Endpoint Performance</CardTitle>
          <CardDescription>Request volume and response times by endpoint</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="endpoint" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="requests" fill="hsl(var(--primary))" name="Requests" />
              <Bar dataKey="avgTime" fill="hsl(var(--secondary))" name="Avg Time (ms)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Endpoint Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Endpoint Statistics
          </CardTitle>
          <CardDescription>Detailed performance metrics for each endpoint</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(endpointStats).map(([endpoint, stats]) => (
              <div key={endpoint} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-primary" />
                  <div>
                    <h4 className="font-medium font-mono text-sm">{endpoint}</h4>
                    <p className="text-sm text-muted-foreground">
                      {stats.requests.toLocaleString()} requests | {Math.round(stats.avgTime)}ms avg
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={stats.errors < 5 ? 'default' : 'destructive'}>
                    {stats.errors} errors
                  </Badge>
                </div>
              </div>
            ))}
            
            {Object.keys(endpointStats).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No API usage data available for the selected time range.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsageAnalytics;
