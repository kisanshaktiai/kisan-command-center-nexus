
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Building2, 
  DollarSign, 
  Activity, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const Overview = () => {
  // Get platform statistics
  const { data: platformStats, isLoading } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('super_admin.get_platform_stats');
      if (error) throw error;
      return data;
    },
  });

  // Get recent alerts
  const { data: recentAlerts } = useQuery({
    queryKey: ['recent-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('super_admin')
        .select('system_alerts(*)')
        .order('system_alerts.created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data?.map(item => item.system_alerts) || [];
    },
  });

  // Mock data for charts
  const growthData = [
    { month: 'Jan', tenants: 45, farmers: 1200, revenue: 28000 },
    { month: 'Feb', tenants: 52, farmers: 1450, revenue: 32000 },
    { month: 'Mar', tenants: 61, farmers: 1720, revenue: 38000 },
    { month: 'Apr', tenants: 68, farmers: 2100, revenue: 45000 },
    { month: 'May', tenants: 75, farmers: 2450, revenue: 52000 },
    { month: 'Jun', tenants: 84, farmers: 2800, revenue: 61000 },
  ];

  const systemHealth = [
    { service: 'API Gateway', status: 99.9, issues: 0 },
    { service: 'Database', status: 99.8, issues: 1 },
    { service: 'AI Services', status: 98.5, issues: 3 },
    { service: 'Storage', status: 99.95, issues: 0 },
    { service: 'Authentication', status: 99.7, issues: 2 },
  ];

  if (isLoading) {
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

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Overview</h1>
        <p className="text-muted-foreground">
          Real-time insights into your KisanShaktiAI platform performance
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformStats?.total_tenants || 0}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Farmers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformStats?.total_farmers || 0}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              +18% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Lands</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformStats?.total_lands || 0}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              +8% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformStats?.support_tickets_open || 0}</div>
            <p className="text-xs text-muted-foreground">
              -15% from last week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Platform Growth</CardTitle>
            <CardDescription>Tenant and farmer acquisition over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="tenants" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Tenants"
                />
                <Line 
                  type="monotone" 
                  dataKey="farmers" 
                  stroke="hsl(var(--secondary))" 
                  strokeWidth={2}
                  name="Farmers"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Growth</CardTitle>
            <CardDescription>Monthly recurring revenue trends</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Bar 
                  dataKey="revenue" 
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* System Health & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Service uptime and performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {systemHealth.map((service) => (
              <div key={service.service} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{service.service}</span>
                  <span className="text-muted-foreground">{service.status}%</span>
                </div>
                <Progress value={service.status} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{service.issues} active issues</span>
                  <Badge variant={service.issues === 0 ? 'default' : 'destructive'}>
                    {service.issues === 0 ? 'Healthy' : 'Issues'}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
            <CardDescription>Latest system alerts and notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAlerts && recentAlerts.length > 0 ? (
              recentAlerts.map((alert) => (
                <Alert key={alert.id}>
                  <div className="flex items-start space-x-2">
                    {getAlertIcon(alert.severity)}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">{alert.title}</h4>
                        <Badge variant={getAlertColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                      </div>
                      <AlertDescription className="text-xs">
                        {alert.description}
                      </AlertDescription>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(alert.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </Alert>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                <p>No recent alerts</p>
                <p className="text-xs">All systems operating normally</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Overview;
