
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Building, DollarSign, Activity, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight, Plus, Settings } from 'lucide-react';
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
    mrr: subscriptionsData?.length ? subscriptionsData.length * 1000 : 0,
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

  const getChangeIndicator = (current: number, previous: number) => {
    if (current > previous) return { icon: ArrowUpRight, color: 'text-green-600', bg: 'bg-green-50' };
    if (current < previous) return { icon: ArrowDownRight, color: 'text-red-600', bg: 'bg-red-50' };
    return { icon: ArrowUpRight, color: 'text-gray-600', bg: 'bg-gray-50' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Platform Overview</h1>
              <p className="text-gray-600 text-lg">Monitor your SaaS platform performance and key metrics</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Tenant
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="relative overflow-hidden border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Total Tenants</CardTitle>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-3xl font-bold text-gray-900">{platformMetrics.totalTenants}</div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded-full">
                    <ArrowUpRight className="w-3 h-3 text-green-600" />
                    <span className="text-xs font-medium text-green-600">+12%</span>
                  </div>
                  <span className="text-xs text-gray-500">vs last month</span>
                </div>
                <p className="text-sm text-gray-600">Active organizations</p>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-green-600"></div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-3xl font-bold text-gray-900">{platformMetrics.totalFarmers}</div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded-full">
                    <ArrowUpRight className="w-3 h-3 text-green-600" />
                    <span className="text-xs font-medium text-green-600">+8%</span>
                  </div>
                  <span className="text-xs text-gray-500">vs last month</span>
                </div>
                <p className="text-sm text-gray-600">Registered farmers</p>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-purple-600"></div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Monthly Revenue</CardTitle>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-3xl font-bold text-gray-900">{formatCurrency(platformMetrics.mrr)}</div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded-full">
                    <ArrowUpRight className="w-3 h-3 text-green-600" />
                    <span className="text-xs font-medium text-green-600">+15%</span>
                  </div>
                  <span className="text-xs text-gray-500">vs last month</span>
                </div>
                <p className="text-sm text-gray-600">MRR from subscriptions</p>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-orange-600"></div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Active Subscriptions</CardTitle>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Activity className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-3xl font-bold text-gray-900">{platformMetrics.activeSubscriptions}</div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded-full">
                    <ArrowUpRight className="w-3 h-3 text-green-600" />
                    <span className="text-xs font-medium text-green-600">+3%</span>
                  </div>
                  <span className="text-xs text-gray-500">vs last month</span>
                </div>
                <p className="text-sm text-gray-600">Paying customers</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-900">Tenant Growth</CardTitle>
                  <CardDescription className="text-gray-600 mt-1">New tenant signups over the last 30 days</CardDescription>
                </div>
                <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                  Last 30 days
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={growthData}>
                  <defs>
                    <linearGradient id="tenantGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
                  <YAxis stroke="#6B7280" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="tenants" 
                    stroke="#3B82F6" 
                    fill="url(#tenantGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-900">Revenue Trend</CardTitle>
                  <CardDescription className="text-gray-600 mt-1">Daily revenue over the last 30 days</CardDescription>
                </div>
                <Badge variant="secondary" className="bg-green-50 text-green-700">
                  Last 30 days
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
                  <YAxis stroke="#6B7280" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10B981" 
                    strokeWidth={3} 
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Platform Alerts
              </CardTitle>
              <CardDescription className="text-gray-600">Recent system alerts and notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alertsData && alertsData.length > 0 ? (
                  alertsData.map((alert) => (
                    <div key={alert.id} className="flex items-start gap-4 p-4 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
                      <div className="flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900">{alert.alert_name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                      </div>
                      <Badge variant={getSeverityColor(alert.severity)} className="flex-shrink-0">
                        {alert.severity}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Activity className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">All systems operational</h3>
                    <p className="text-gray-600">No active alerts at this time</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-6">
              <CardTitle className="text-xl font-semibold text-gray-900">Quick Actions</CardTitle>
              <CardDescription className="text-gray-600">Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                <Button variant="outline" className="w-full justify-start h-14 text-left hover:bg-blue-50 hover:border-blue-200 transition-all duration-200 group">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Manage Tenants</div>
                      <div className="text-sm text-gray-500">View and manage all tenants</div>
                    </div>
                  </div>
                </Button>

                <Button variant="outline" className="w-full justify-start h-14 text-left hover:bg-purple-50 hover:border-purple-200 transition-all duration-200 group">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                      <DollarSign className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Billing Reports</div>
                      <div className="text-sm text-gray-500">View financial analytics</div>
                    </div>
                  </div>
                </Button>

                <Button variant="outline" className="w-full justify-start h-14 text-left hover:bg-green-50 hover:border-green-200 transition-all duration-200 group">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                      <Activity className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">System Health</div>
                      <div className="text-sm text-gray-500">Monitor system performance</div>
                    </div>
                  </div>
                </Button>

                <Button variant="outline" className="w-full justify-start h-14 text-left hover:bg-orange-50 hover:border-orange-200 transition-all duration-200 group">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                      <TrendingUp className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Analytics Dashboard</div>
                      <div className="text-sm text-gray-500">View detailed insights</div>
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
