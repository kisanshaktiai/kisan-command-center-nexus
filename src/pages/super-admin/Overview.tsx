
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
import { formatCurrency, formatCompactCurrency } from '@/lib/currency';

const Overview = () => {
  const { metrics, isLoading, getMetricChange } = useSuperAdminMetrics();
  const realtimeData = useRealtimeSubscriptions();
  
  // Prioritize real-time data over cached metrics
  const latestSystemMetric = realtimeData.systemMetrics[0];
  const latestResourceMetric = realtimeData.resourceMetrics[0];
  const latestFinancialMetric = realtimeData.financialMetrics[0];

  // Use real-time data first, fallback to metrics hook data
  const liveSystemHealth = latestSystemMetric?.health_score || 
                          latestSystemMetric?.value || 
                          metrics?.systemHealth || 
                          95;
  
  const liveStorageUsed = latestResourceMetric?.usage_percentage || 
                         latestResourceMetric?.current_usage || 
                         metrics?.storageUsed || 
                         45;
  
  const liveRevenue = latestFinancialMetric?.monthly_recurring_revenue || 
                     latestFinancialMetric?.amount || 
                     metrics?.monthlyRevenue || 
                     0;

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
          <div className="text-xs text-slate-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Key Metrics - Using Real-time Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <MetricCard
          title="Total Tenant Count"
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
          loading={false}
        />
        
        <MetricCard
          title="API Calls (24h)"
          value={realtimeData.apiUsage.length}
          icon={Activity}
          gradient="from-purple-500/10 to-purple-600/20"
          iconColor="bg-gradient-to-r from-purple-500 to-purple-600"
          loading={false}
        />
        
        <MetricCard
          title="System Health"
          value={`${Math.round(liveSystemHealth)}%`}
          change={getMetricChange(liveSystemHealth, 'systemHealth')}
          icon={Shield}
          gradient="from-emerald-500/10 to-emerald-600/20"
          iconColor="bg-gradient-to-r from-emerald-500 to-emerald-600"
          loading={false}
        />
        
        <MetricCard
          title="Revenue (Monthly)"
          value={formatCompactCurrency(liveRevenue)}
          change={getMetricChange(liveRevenue, 'monthlyRevenue')}
          icon={DollarSign}
          gradient="from-amber-500/10 to-amber-600/20"
          iconColor="bg-gradient-to-r from-amber-500 to-amber-600"
          loading={false}
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
        
        {/* Additional metrics card - Using Live Data */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              title="Storage Used"
              value={`${Math.round(liveStorageUsed)}%`}
              icon={Database}
              gradient="from-orange-500/10 to-orange-600/20"
              iconColor="bg-gradient-to-r from-orange-500 to-orange-600"
              loading={false}
            />
            
            <MetricCard
              title="Active Subscriptions"
              value={latestFinancialMetric?.active_subscriptions || metrics?.activeSubscriptions || 0}
              icon={CreditCard}
              gradient="from-indigo-500/10 to-indigo-600/20"
              iconColor="bg-gradient-to-r from-indigo-500 to-indigo-600"
              loading={false}
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
              value={`${Math.round(liveSystemHealth)}%`}
              icon={Zap}
              gradient="from-cyan-500/10 to-cyan-600/20"
              iconColor="bg-gradient-to-r from-cyan-500 to-cyan-600"
              loading={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
