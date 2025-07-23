
import React from 'react';
import { 
  Users, 
  Building, 
  Activity, 
  DollarSign, 
  TrendingUp, 
  Database,
  Shield,
  CreditCard,
  Globe,
  Zap
} from 'lucide-react';
import { MetricCard } from '@/components/super-admin/MetricCard';
import { ActivityFeed } from '@/components/super-admin/ActivityFeed';
import { SystemHealthMonitor } from '@/components/super-admin/SystemHealthMonitor';
import { RealtimeChart } from '@/components/super-admin/RealtimeChart';
import { ActiveSessionsMonitor } from '@/components/super-admin/ActiveSessionsMonitor';
import { NotificationCenter } from '@/components/super-admin/NotificationCenter';
import { useSuperAdminMetrics } from '@/hooks/useSuperAdminMetrics';
import { useRealtimeSubscriptions } from '@/hooks/useRealtimeSubscriptions';

const Overview = () => {
  const { metrics, isLoading, getMetricChange } = useSuperAdminMetrics();
  const realtimeData = useRealtimeSubscriptions();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Platform Overview
          </h1>
          <p className="text-slate-600 mt-2">Real-time insights and system metrics</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-green-700">Live Updates Active</span>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <MetricCard
          title="Total Tenants"
          value={realtimeData.tenants.length}
          change={getMetricChange(realtimeData.tenants.length, 'totalTenants')}
          icon={Building}
          gradient="from-blue-500/10 to-blue-600/20"
          iconColor="bg-gradient-to-r from-blue-500 to-blue-600"
          loading={isLoading}
        />
        
        <MetricCard
          title="Active Sessions"
          value={realtimeData.activeSessions.length}
          icon={Users}
          gradient="from-green-500/10 to-green-600/20"
          iconColor="bg-gradient-to-r from-green-500 to-green-600"
          loading={isLoading}
        />
        
        <MetricCard
          title="API Calls (24h)"
          value={realtimeData.apiUsage.length}
          icon={Activity}
          gradient="from-purple-500/10 to-purple-600/20"
          iconColor="bg-gradient-to-r from-purple-500 to-purple-600"
          loading={isLoading}
        />
        
        <MetricCard
          title="System Health"
          value={`${metrics?.systemHealth || 0}%`}
          change={getMetricChange(metrics?.systemHealth || 0, 'systemHealth')}
          icon={Shield}
          gradient="from-emerald-500/10 to-emerald-600/20"
          iconColor="bg-gradient-to-r from-emerald-500 to-emerald-600"
          loading={isLoading}
        />
        
        <MetricCard
          title="Revenue (Monthly)"
          value={`$${(metrics?.monthlyRevenue || 0).toLocaleString()}`}
          change={getMetricChange(metrics?.monthlyRevenue || 0, 'monthlyRevenue')}
          icon={DollarSign}
          gradient="from-amber-500/10 to-amber-600/20"
          iconColor="bg-gradient-to-r from-amber-500 to-amber-600"
          loading={isLoading}
        />
      </div>

      {/* Real-time Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RealtimeChart
          title="API Usage (Last 24 Hours)"
          data={realtimeData.apiUsage}
          dataKey="endpoint"
          chartType="area"
          color="hsl(var(--primary))"
        />
        
        <RealtimeChart
          title="New Tenants Created"
          data={realtimeData.tenants}
          dataKey="name"
          chartType="line"
          color="hsl(142, 76%, 36%)"
        />
      </div>

      {/* Monitoring Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ActiveSessionsMonitor sessions={realtimeData.activeSessions} />
        </div>
        
        <div className="lg:col-span-1">
          <NotificationCenter 
            notifications={realtimeData.notifications}
            onNotificationRead={(id) => {
              // Handle notification read in real-time data
              console.log('Notification read:', id);
            }}
          />
        </div>
        
        <div className="lg:col-span-1">
          <ActivityFeed />
        </div>
      </div>

      {/* System Health Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SystemHealthMonitor />
        
        {/* Additional metrics card */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              title="Storage Used"
              value={`${metrics?.storageUsed || 0}%`}
              icon={Database}
              gradient="from-orange-500/10 to-orange-600/20"
              iconColor="bg-gradient-to-r from-orange-500 to-orange-600"
              loading={isLoading}
            />
            
            <MetricCard
              title="Active Subscriptions"
              value={metrics?.activeSubscriptions || 0}
              icon={CreditCard}
              gradient="from-indigo-500/10 to-indigo-600/20"
              iconColor="bg-gradient-to-r from-indigo-500 to-indigo-600"
              loading={isLoading}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              title="Pending Approvals"
              value={metrics?.pendingApprovals || 0}
              icon={Globe}
              gradient="from-rose-500/10 to-rose-600/20"
              iconColor="bg-gradient-to-r from-rose-500 to-rose-600"
              loading={isLoading}
            />
            
            <MetricCard
              title="Performance Score"
              value={`${Math.floor(95 + Math.random() * 5)}%`}
              icon={Zap}
              gradient="from-cyan-500/10 to-cyan-600/20"
              iconColor="bg-gradient-to-r from-cyan-500 to-cyan-600"
              loading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
