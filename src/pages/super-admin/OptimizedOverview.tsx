
import React from 'react';
import { OptimizedOverviewMetrics } from '@/components/super-admin/OptimizedOverviewMetrics';
import { OptimizedRealtimeChart } from '@/components/super-admin/OptimizedRealtimeChart';
import { ActiveSessionsMonitor } from '@/components/super-admin/ActiveSessionsMonitor';
import { NotificationCenter } from '@/components/super-admin/NotificationCenter';
import { ActivityFeed } from '@/components/super-admin/ActivityFeed';
import { SystemHealthMonitor } from '@/components/super-admin/SystemHealthMonitor';
import { useOptimizedAdminDashboard } from '@/hooks/useOptimizedAdminDashboard';

const OptimizedOverview = () => {
  const { data, isLoading, hasRealtimeUpdates } = useOptimizedAdminDashboard();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 p-6">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-slate-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-32 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Platform Overview
          </h1>
          <p className="text-slate-600 mt-2">
            Optimized real-time insights and system metrics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-4 py-2 border rounded-lg ${
            hasRealtimeUpdates 
              ? 'bg-green-50 border-green-200' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              hasRealtimeUpdates ? 'bg-green-500 animate-pulse' : 'bg-slate-400'
            }`}></div>
            <span className={`text-sm font-medium ${
              hasRealtimeUpdates ? 'text-green-700' : 'text-slate-600'
            }`}>
              {hasRealtimeUpdates ? 'Live Updates Active' : 'Cached Data'}
            </span>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <OptimizedOverviewMetrics />

      {/* Optimized Charts - Limited Data Points */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <OptimizedRealtimeChart
            title="Recent API Activity"
            data={data.recentApiLogs}
            dataKey="endpoint"
            chartType="area"
            color="hsl(var(--primary))"
            maxDataPoints={12} // Limit to 12 hours
          />
          
          <OptimizedRealtimeChart
            title="System Health Trend"
            data={[]} // Use empty array since latestSystemMetrics doesn't exist
            dataKey="value"
            chartType="line"
            color="hsl(142, 76%, 36%)"
            maxDataPoints={10} // Limit to 10 data points
          />
        </div>
      )}

      {/* Monitoring Panels - Reuse existing optimized components */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ActiveSessionsMonitor sessions={data?.activeSessions || []} />
        </div>
        
        <div className="lg:col-span-1">
          <NotificationCenter 
            notifications={data?.unreadNotifications || []}
            onNotificationRead={(id) => {
              console.log('Notification read:', id);
              // Note: In a real implementation, this would update the cache
            }}
          />
        </div>
        
        <div className="lg:col-span-1">
          <ActivityFeed />
        </div>
      </div>

      {/* System Health Section */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <SystemHealthMonitor />
      </div>
    </div>
  );
};

export default OptimizedOverview;
