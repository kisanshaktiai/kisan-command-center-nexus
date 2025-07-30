
import React from 'react';
import { 
  Database,
  CreditCard,
  Globe,
  Zap,
  Server,
  HardDrive
} from 'lucide-react';
import { MetricCard } from '@/components/super-admin/MetricCard';
import { ActivityFeed } from '@/components/super-admin/ActivityFeed';
import { SystemHealthMonitor } from '@/components/super-admin/SystemHealthMonitor';
import { RealtimeChart } from '@/components/super-admin/RealtimeChart';
import { ActiveSessionsMonitor } from '@/components/super-admin/ActiveSessionsMonitor';
import { NotificationCenter } from '@/components/super-admin/NotificationCenter';
import { RealTimeOverviewMetrics } from '@/components/super-admin/RealTimeOverviewMetrics';
import { useRealtimeSubscriptions } from '@/hooks/useRealtimeSubscriptions';
import { useRealTimeSystemMetrics } from '@/hooks/useRealTimeSystemMetrics';
import { useSuperAdminMetrics } from '@/hooks/useSuperAdminMetrics';

const Overview = () => {
  const realtimeData = useRealtimeSubscriptions();
  const { 
    currentCpuUsage, 
    currentMemoryUsage, 
    currentDiskUsage,
    currentStorageUsed,
    currentStorageTotal,
    hasRealtimeUpdates: systemRealtimeUpdates
  } = useRealTimeSystemMetrics();
  const { metrics, isLoading } = useSuperAdminMetrics();

  // Always show as live since we have real-time subscriptions active
  const hasLiveUpdates = true;

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

      {/* Key Metrics - Real-time Data */}
      <RealTimeOverviewMetrics />

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

      {/* System Health Section with Real-Time Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SystemHealthMonitor />
        
        {/* Real-time System Metrics */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              title="CPU Usage"
              value={`${currentCpuUsage}%`}
              icon={Server}
              gradient="from-orange-500/10 to-orange-600/20"
              iconColor="bg-gradient-to-r from-orange-500 to-orange-600"
              loading={false}
            />
            
            <MetricCard
              title="Memory Usage"
              value={`${currentMemoryUsage}%`}
              icon={Database}
              gradient="from-indigo-500/10 to-indigo-600/20"
              iconColor="bg-gradient-to-r from-indigo-500 to-indigo-600"
              loading={false}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              title="Disk Usage"
              value={`${currentDiskUsage}%`}
              icon={HardDrive}
              gradient="from-rose-500/10 to-rose-600/20"
              iconColor="bg-gradient-to-r from-rose-500 to-rose-600"
              loading={false}
            />
            
            <MetricCard
              title="Storage Used"
              value={`${Math.round((currentStorageUsed / currentStorageTotal) * 100)}%`}
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
