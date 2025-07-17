
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Activity, 
  TrendingUp, 
  Globe, 
  Smartphone, 
  Monitor,
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

      const { data, error } = await supabase
        .from('usage_analytics')
        .select('*')
        .gte('timestamp', startTime)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    refetchInterval: refreshInterval,
  });

  // Mock data for demonstration
  const featureUsage = [
    { name: 'AI Chat', usage: 4520, trend: '+12%' },
    { name: 'Land Analysis', usage: 3200, trend: '+8%' },
    { name: 'Weather Data', usage: 2800, trend: '+15%' },
    { name: 'Market Prices', usage: 2100, trend: '+5%' },
    { name: 'Crop Planning', usage: 1850, trend: '+22%' },
    { name: 'Financial Tracking', usage: 1200, trend: '+18%' },
  ];

  const endpointData = [
    { endpoint: '/api/chat', requests: 15420, avg_response: 245, errors: 12 },
    { endpoint: '/api/lands', requests: 8750, avg_response: 156, errors: 3 },
    { endpoint: '/api/weather', requests: 6200, avg_response: 89, errors: 1 },
    { endpoint: '/api/market', requests: 4800, avg_response: 112, errors: 8 },
    { endpoint: '/api/auth', requests: 12500, avg_response: 67, errors: 15 },
  ];

  const deviceTypes = [
    { name: 'Mobile', value: 68, color: '#8884d8' },
    { name: 'Desktop', value: 25, color: '#82ca9d' },
    { name: 'Tablet', value: 7, color: '#ffc658' },
  ];

  const hourlyUsage = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    requests: Math.floor(Math.random() * 1000) + 200,
    users: Math.floor(Math.random() * 150) + 50,
  }));

  const storageUsage = [
    { tenant: 'Tenant A', storage: 245.6, bandwidth: 1.2 },
    { tenant: 'Tenant B', storage: 189.3, bandwidth: 0.8 },
    { tenant: 'Tenant C', storage: 156.7, bandwidth: 0.6 },
    { tenant: 'Tenant D', storage: 134.2, bandwidth: 0.5 },
    { tenant: 'Tenant E', storage: 98.4, bandwidth: 0.4 },
  ];

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
            <div className="text-2xl font-bold">47.2K</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              +12% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              +8% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156ms</div>
            <p className="text-xs text-muted-foreground">
              -5ms from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0.12%</div>
            <p className="text-xs text-muted-foreground">
              -0.03% from last period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Hourly Usage Pattern</CardTitle>
            <CardDescription>Requests and active users by hour</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={hourlyUsage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="requests" stroke="hsl(var(--primary))" strokeWidth={2} name="Requests" />
                <Line type="monotone" dataKey="users" stroke="hsl(var(--secondary))" strokeWidth={2} name="Users" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Device Distribution</CardTitle>
            <CardDescription>Usage by device type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={deviceTypes}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {deviceTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Feature Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Feature Adoption
          </CardTitle>
          <CardDescription>Most popular features and their usage trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {featureUsage.map((feature) => (
              <div key={feature.name} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-primary" />
                  <div>
                    <h4 className="font-medium">{feature.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {feature.usage.toLocaleString()} uses
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-green-600">
                  {feature.trend}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Endpoints Performance */}
      <Card>
        <CardHeader>
          <CardTitle>API Endpoint Performance</CardTitle>
          <CardDescription>Performance metrics for top API endpoints</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {endpointData.map((endpoint) => (
              <div key={endpoint.endpoint} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium font-mono text-sm">{endpoint.endpoint}</h4>
                  <p className="text-sm text-muted-foreground">
                    {endpoint.requests.toLocaleString()} requests | {endpoint.avg_response}ms avg
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={endpoint.errors < 5 ? 'default' : 'destructive'}>
                    {endpoint.errors} errors
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Storage & Bandwidth */}
      <Card>
        <CardHeader>
          <CardTitle>Storage & Bandwidth Usage</CardTitle>
          <CardDescription>Top consuming tenants</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={storageUsage}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tenant" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="storage" fill="hsl(var(--primary))" name="Storage (GB)" />
              <Bar dataKey="bandwidth" fill="hsl(var(--secondary))" name="Bandwidth (TB)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsageAnalytics;
