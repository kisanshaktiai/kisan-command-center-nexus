
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Building, DollarSign, Activity, TrendingUp, AlertTriangle } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function Overview() {
  // Fetch real tenants data
  const { data: tenantsData } = useQuery({
    queryKey: ['platform-tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, status, created_at')
        .eq('status', 'active');
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Fetch real farmers/users data
  const { data: farmersData } = useQuery({
    queryKey: ['platform-farmers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('farmers')
        .select('id, created_at, is_verified');
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Fetch financial metrics
  const { data: financialData } = useQuery({
    queryKey: ['platform-financial'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_metrics')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Fetch tenant subscriptions
  const { data: subscriptionsData } = useQuery({
    queryKey: ['platform-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_subscriptions')
        .select(`
          *,
          billing_plans(base_price, currency)
        `)
        .eq('status', 'active');
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Fetch system alerts
  const { data: alertsData } = useQuery({
    queryKey: ['platform-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_alerts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Calculate platform metrics from real data
  const platformMetrics = {
    totalTenants: tenantsData?.length || 0,
    totalFarmers: farmersData?.length || 0,
    totalRevenue: financialData?.reduce((sum, metric) => {
      return metric.metric_name === 'total_revenue' ? sum + (metric.amount || 0) : sum;
    }, 0) || 0,
    mrr: subscriptionsData?.reduce((sum, sub) => sum + (sub.billing_plans?.base_price || 0), 0) || 0,
    activeSubscriptions: subscriptionsData?.length || 0,
  };

  // Generate growth data from actual database records (last 30 days)
  const growthData = React.useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: date.toISOString().split('T')[0],
        tenants: 0,
        farmers: 0,
        revenue: 0
      };
    });

    // Count tenants created each day
    tenantsData?.forEach(tenant => {
      const createdDate = new Date(tenant.created_at).toISOString().split('T')[0];
      const dayData = last30Days.find(d => d.date === createdDate);
      if (dayData) {
        dayData.tenants += 1;
      }
    });

    // Count farmers created each day
    farmersData?.forEach(farmer => {
      const createdDate = new Date(farmer.created_at).toISOString().split('T')[0];
      const dayData = last30Days.find(d => d.date === createdDate);
      if (dayData) {
        dayData.farmers += 1;
      }
    });

    // Add revenue data from financial metrics
    financialData?.forEach(metric => {
      if (metric.metric_name === 'daily_revenue') {
        const metricDate = new Date(metric.timestamp).toISOString().split('T')[0];
        const dayData = last30Days.find(d => d.date === metricDate);
        if (dayData) {
          dayData.revenue += metric.amount || 0;
        }
      }
    });

    return last30Days;
  }, [tenantsData, farmersData, financialData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Platform Overview</h1>
        <p className="text-muted-foreground">Monitor your SaaS platform performance and key metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformMetrics.totalTenants}</div>
            <p className="text-xs text-muted-foreground">Active organizations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformMetrics.totalFarmers}</div>
            <p className="text-xs text-muted-foreground">Registered farmers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(platformMetrics.mrr)}</div>
            <p className="text-xs text-muted-foreground">MRR from subscriptions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformMetrics.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">Paying customers</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tenant Growth</CardTitle>
            <CardDescription>New tenant signups over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="tenants" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Daily revenue over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#82ca9d" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Platform Alerts
            </CardTitle>
            <CardDescription>Recent system alerts and notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {alertsData && alertsData.length > 0 ? (
                alertsData.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{alert.alert_name}</h4>
                      <p className="text-sm text-muted-foreground">{alert.description}</p>
                    </div>
                    <Badge variant={getSeverityColor(alert.severity)}>
                      {alert.severity}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No active alerts
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Manage Tenants
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <DollarSign className="mr-2 h-4 w-4" />
                View Billing Reports
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Activity className="mr-2 h-4 w-4" />
                System Health Check
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="mr-2 h-4 w-4" />
                Analytics Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
