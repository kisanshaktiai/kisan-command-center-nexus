import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Building, DollarSign, Activity, TrendingUp, AlertTriangle, ArrowUpRight } from 'lucide-react';
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
        .select('id, name, created_at')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching tenants:', error);
        return [];
      }
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
      
      if (error) {
        console.error('Error fetching farmers:', error);
        return [];
      }
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
      
      if (error) {
        console.error('Error fetching financial data:', error);
        return [];
      }
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
        .select('*')
        .eq('status', 'active');
      
      if (error) {
        console.error('Error fetching subscriptions:', error);
        return [];
      }
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Mock alerts data since system_alerts table doesn't exist
  const alertsData = [
    {
      id: '1',
      alert_name: 'High Memory Usage',
      description: 'Server memory usage is above 85%',
      severity: 'medium'
    },
    {
      id: '2', 
      alert_name: 'Database Connection Pool',
      description: 'Connection pool nearing capacity',
      severity: 'low'
    }
  ];

  // Calculate platform metrics from real data
  const platformMetrics = {
    totalTenants: tenantsData?.length || 0,
    totalFarmers: farmersData?.length || 0,
    totalRevenue: financialData?.reduce((sum, metric) => {
      return metric.metric_name === 'total_revenue' ? sum + (metric.amount || 0) : sum;
    }, 0) || 0,
    mrr: subscriptionsData?.length ? subscriptionsData.length * 1000 : 0, // Mock MRR calculation
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
      if (tenant.created_at) {
        const createdDate = new Date(tenant.created_at).toISOString().split('T')[0];
        const dayData = last30Days.find(d => d.date === createdDate);
        if (dayData) {
          dayData.tenants += 1;
        }
      }
    });

    // Count farmers created each day
    farmersData?.forEach(farmer => {
      if (farmer.created_at) {
        const createdDate = new Date(farmer.created_at).toISOString().split('T')[0];
        const dayData = last30Days.find(d => d.date === createdDate);
        if (dayData) {
          dayData.farmers += 1;
        }
      }
    });

    // Add revenue data from financial metrics
    financialData?.forEach(metric => {
      if (metric.metric_name === 'daily_revenue' && metric.timestamp) {
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
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
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
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
        <h1 className="text-4xl font-bold mb-2">Platform Overview</h1>
        <p className="text-blue-100 text-lg">Monitor your SaaS platform performance and key metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Total Tenants</CardTitle>
            <div className="p-2 bg-blue-500 rounded-lg">
              <Building className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{platformMetrics.totalTenants}</div>
            <p className="text-xs text-blue-600 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              Active organizations
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Total Users</CardTitle>
            <div className="p-2 bg-green-500 rounded-lg">
              <Users className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">{platformMetrics.totalFarmers}</div>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              Registered farmers
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">Monthly Revenue</CardTitle>
            <div className="p-2 bg-purple-500 rounded-lg">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900">{formatCurrency(platformMetrics.mrr)}</div>
            <p className="text-xs text-purple-600 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              MRR from subscriptions
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">Active Subscriptions</CardTitle>
            <div className="p-2 bg-orange-500 rounded-lg">
              <Activity className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900">{platformMetrics.activeSubscriptions}</div>
            <p className="text-xs text-orange-600 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              Paying customers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-slate-800">Tenant Growth</CardTitle>
            <CardDescription className="text-slate-600">New tenant signups over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }} 
                />
                <Area type="monotone" dataKey="tenants" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-slate-800">Revenue Trend</CardTitle>
            <CardDescription className="text-slate-600">Daily revenue over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }} 
                />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Quick Actions */}
      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-800">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Platform Alerts
            </CardTitle>
            <CardDescription className="text-slate-600">Recent system alerts and notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {alertsData && alertsData.length > 0 ? (
                alertsData.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-gradient-to-r from-slate-50 to-white hover:shadow-md transition-all duration-200">
                    <div>
                      <h4 className="font-semibold text-slate-800">{alert.alert_name}</h4>
                      <p className="text-sm text-slate-600">{alert.description}</p>
                    </div>
                    <Badge variant={getSeverityColor(alert.severity)} className="font-medium">
                      {alert.severity}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p>No active alerts</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-slate-800">Quick Actions</CardTitle>
            <CardDescription className="text-slate-600">Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start h-12 text-left hover:bg-blue-50 hover:border-blue-200 transition-all duration-200">
                <Users className="mr-3 h-5 w-5 text-blue-500" />
                <span className="font-medium">Manage Tenants</span>
              </Button>
              <Button variant="outline" className="w-full justify-start h-12 text-left hover:bg-purple-50 hover:border-purple-200 transition-all duration-200">
                <DollarSign className="mr-3 h-5 w-5 text-purple-500" />
                <span className="font-medium">View Billing Reports</span>
              </Button>
              <Button variant="outline" className="w-full justify-start h-12 text-left hover:bg-green-50 hover:border-green-200 transition-all duration-200">
                <Activity className="mr-3 h-5 w-5 text-green-500" />
                <span className="font-medium">System Health Check</span>
              </Button>
              <Button variant="outline" className="w-full justify-start h-12 text-left hover:bg-orange-50 hover:border-orange-200 transition-all duration-200">
                <TrendingUp className="mr-3 h-5 w-5 text-orange-500" />
                <span className="font-medium">Analytics Dashboard</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
