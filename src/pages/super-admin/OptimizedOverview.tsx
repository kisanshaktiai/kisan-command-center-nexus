
import React from 'react';
import { Database, CreditCard, Globe, Zap } from 'lucide-react';
import { OptimizedOverviewMetrics } from '@/components/super-admin/OptimizedOverviewMetrics';
import { OptimizedRealtimeChart } from '@/components/super-admin/OptimizedRealtimeChart';
import { ActiveSessionsMonitor } from '@/components/super-admin/ActiveSessionsMonitor';
import { NotificationCenter } from '@/components/super-admin/NotificationCenter';
import { ActivityFeed } from '@/components/super-admin/ActivityFeed';
import { SystemHealthMonitor } from '@/components/super-admin/SystemHealthMonitor';
import { MetricCard } from '@/components/super-admin/MetricCard';
import { useAdminDashboard, useAdminRealtimeData } from '@/hooks/useAdminDashboard';
import { useOptimizedRealtimeSubscriptions } from '@/hooks/useOptimizedRealtimeSubscriptions';

const OptimizedOverview = () => {
  const { data: dashboardData, isLoading } = useAdminDashboard();
  const realtimeData = useAdminRealtimeData();
  const optimizedRealtimeData = useOptimizedRealtimeSubscriptions();
  
  const handleNotificationRead = (id: string) => {
    console.log('Notification read:', id);
    // This would typically update the notification status
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Platform Overview (Optimized)
          </h1>
          <p className="text-slate-600 mt-2">Real-time insights with optimized performance</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-green-700">
              Optimized Updates ({realtimeData.criticalAlerts} alerts)
            </span>
          </div>
        </div>
      </div>

      {/* Key Metrics - Using consolidated data */}
      <OptimizedOverviewMetrics />

      {/* Real-time Charts - Limited data points */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OptimizedRealtimeChart
          title="Recent Tenant Activity"
          data={optimizedRealtimeData.recentTenants}
          dataKey="name"
          chartType="area"
          color="hsl(var(--primary))"
          maxDataPoints={12} // Only last 12 hours
        />
        
        <OptimizedRealtimeChart
          title="Active Sessions Trend"
          data={optimizedRealtimeData.activeSessions}
          dataKey="user_id"
          chartType="line"
          color="hsl(142, 76%, 36%)"
          maxDataPoints={12} // Only last 12 hours
        />
      </div>

      {/* Monitoring Panels - Using cached data */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ActiveSessionsMonitor 
            sessions={dashboardData?.activeSessions || []} 
          />
        </div>
        
        <div className="lg:col-span-1">
          <NotificationCenter 
            notifications={optimizedRealtimeData.criticalNotifications}
            onNotificationRead={handleNotificationRead}
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
              value={`${dashboardData?.storageUsed || 0}%`}
              icon={Database}
              gradient="from-orange-500/10 to-orange-600/20"
              iconColor="bg-gradient-to-r from-orange-500 to-orange-600"
              loading={isLoading}
            />
            
            <MetricCard
              title="Active Subscriptions"
              value={dashboardData?.activeSubscriptions || 0}
              icon={CreditCard}
              gradient="from-indigo-500/10 to-indigo-600/20"
              iconColor="bg-gradient-to-r from-indigo-500 to-indigo-600"
              loading={isLoading}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              title="Pending Approvals"
              value={dashboardData?.pendingApprovals || 0}
              icon={Globe}
              gradient="from-rose-500/10 to-rose-600/20"
              iconColor="bg-gradient-to-r from-rose-500 to-rose-600"
              loading={isLoading}
            />
            
            <MetricCard
              title="System Status"
              value={realtimeData.systemStatus === 'healthy' ? '✓ Healthy' : '⚠ Issues'}
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

export default OptimizedOverview;
