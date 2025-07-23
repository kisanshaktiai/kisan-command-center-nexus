
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Building, 
  DollarSign, 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  ArrowUpRight,
  Server,
  Database,
  Shield,
  Zap,
  Globe,
  BarChart3
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MetricCard } from '@/components/super-admin/MetricCard';
import { ActivityFeed } from '@/components/super-admin/ActivityFeed';
import { SystemHealthMonitor } from '@/components/super-admin/SystemHealthMonitor';
import { useSuperAdminMetrics } from '@/hooks/useSuperAdminMetrics';

export default function Overview() {
  const { metrics, isLoading, getMetricChange } = useSuperAdminMetrics();

  // Generate trend data for charts (mock data for demonstration)
  const trendData = React.useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: date.toISOString().split('T')[0],
        tenants: Math.floor(Math.random() * 10) + (metrics?.totalTenants || 0) - 15 + i * 0.5,
        farmers: Math.floor(Math.random() * 50) + (metrics?.totalFarmers || 0) - 200 + i * 7,
        revenue: Math.floor(Math.random() * 5000) + 15000 + i * 500,
        apiCalls: Math.floor(Math.random() * 1000) + 5000 + i * 100,
      };
    });
  }, [metrics]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-green-400/10 to-blue-400/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative space-y-8 animate-fade-in p-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 rounded-3xl p-8 text-white shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                Platform Command Center
              </h1>
              <p className="text-blue-100 text-lg opacity-90">
                Real-time insights and system monitoring dashboard
              </p>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">All Systems Operational</span>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Tenants"
            value={metrics?.totalTenants || 0}
            change={getMetricChange(metrics?.totalTenants || 0, 'totalTenants')}
            icon={Building}
            gradient="hover:from-blue-50 hover:to-blue-100"
            iconColor="bg-gradient-to-r from-blue-500 to-blue-600"
            loading={isLoading}
          />
          
          <MetricCard
            title="Active Farmers"
            value={metrics?.activeFarmers || 0}
            change={getMetricChange(metrics?.activeFarmers || 0, 'activeFarmers')}
            icon={Users}
            gradient="hover:from-green-50 hover:to-green-100"
            iconColor="bg-gradient-to-r from-green-500 to-green-600"
            loading={isLoading}
          />
          
          <MetricCard
            title="Monthly Revenue"
            value={formatCurrency(metrics?.monthlyRevenue || 0)}
            change={getMetricChange(metrics?.monthlyRevenue || 0, 'monthlyRevenue')}
            icon={DollarSign}
            gradient="hover:from-purple-50 hover:to-purple-100"
            iconColor="bg-gradient-to-r from-purple-500 to-purple-600"
            loading={isLoading}
          />
          
          <MetricCard
            title="API Calls (30d)"
            value={metrics?.totalApiCalls || 0}
            change={getMetricChange(metrics?.totalApiCalls || 0, 'totalApiCalls')}
            icon={Zap}
            gradient="hover:from-orange-50 hover:to-orange-100"
            iconColor="bg-gradient-to-r from-orange-500 to-orange-600"
            loading={isLoading}
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="System Health"
            value={`${metrics?.systemHealth || 0}%`}
            icon={Shield}
            gradient="hover:from-emerald-50 hover:to-emerald-100"
            iconColor="bg-gradient-to-r from-emerald-500 to-emerald-600"
            loading={isLoading}
          />
          
          <MetricCard
            title="Storage Used"
            value={`${metrics?.storageUsed || 0}%`}
            icon={Database}
            gradient="hover:from-cyan-50 hover:to-cyan-100"
            iconColor="bg-gradient-to-r from-cyan-500 to-cyan-600"
            loading={isLoading}
          />
          
          <MetricCard
            title="Active Subscriptions"
            value={metrics?.activeSubscriptions || 0}
            icon={Globe}
            gradient="hover:from-indigo-50 hover:to-indigo-100"
            iconColor="bg-gradient-to-r from-indigo-500 to-indigo-600"
            loading={isLoading}
          />
          
          <MetricCard
            title="Pending Approvals"
            value={metrics?.pendingApprovals || 0}
            icon={AlertTriangle}
            gradient="hover:from-yellow-50 hover:to-yellow-100"
            iconColor="bg-gradient-to-r from-yellow-500 to-yellow-600"
            loading={isLoading}
          />
        </div>

        {/* Charts and Analytics */}
        <div className="grid gap-8 lg:grid-cols-2">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white/90 to-slate-50/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Platform Growth
              </CardTitle>
              <CardDescription className="text-slate-600">
                Tenant and farmer growth over the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b" 
                    fontSize={12}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
                      backdropFilter: 'blur(10px)'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="tenants" 
                    stroke="#3b82f6" 
                    fill="url(#tenantsGradient)" 
                    strokeWidth={3}
                    name="Tenants"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="farmers" 
                    stroke="#10b981" 
                    fill="url(#farmersGradient)" 
                    strokeWidth={3}
                    name="Farmers"
                  />
                  <defs>
                    <linearGradient id="tenantsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id="farmersGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white/90 to-slate-50/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                Revenue & API Usage
              </CardTitle>
              <CardDescription className="text-slate-600">
                Financial performance and API consumption trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b" 
                    fontSize={12}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
                      backdropFilter: 'blur(10px)'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#8b5cf6" 
                    strokeWidth={3} 
                    dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                    name="Revenue (₹)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="apiCalls" 
                    stroke="#f59e0b" 
                    strokeWidth={3} 
                    dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                    name="API Calls"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Activity Feed and System Health */}
        <div className="grid gap-8 lg:grid-cols-2">
          <ActivityFeed />
          <SystemHealthMonitor />
        </div>

        {/* Quick Actions */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white/90 to-slate-50/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-slate-800">
              Quick Actions
            </CardTitle>
            <CardDescription className="text-slate-600">
              Common administrative tasks and system operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="h-16 flex-col gap-2 hover:bg-blue-50 hover:border-blue-200 hover:shadow-md transition-all duration-200 group"
              >
                <Users className="h-5 w-5 text-blue-500 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Manage Tenants</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-16 flex-col gap-2 hover:bg-purple-50 hover:border-purple-200 hover:shadow-md transition-all duration-200 group"
              >
                <DollarSign className="h-5 w-5 text-purple-500 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Billing Reports</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-16 flex-col gap-2 hover:bg-green-50 hover:border-green-200 hover:shadow-md transition-all duration-200 group"
              >
                <Server className="h-5 w-5 text-green-500 group-hover:scale-110 transition-transform" />
                <span className="font-medium">System Health</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-16 flex-col gap-2 hover:bg-orange-50 hover:border-orange-200 hover:shadow-md transition-all duration-200 group"
              >
                <BarChart3 className="h-5 w-5 text-orange-500 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Analytics</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
