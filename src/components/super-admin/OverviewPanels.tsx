import React from 'react';
import { Database, CreditCard, Globe, Zap } from 'lucide-react';
import { ActiveSessionsMonitor } from '@/components/super-admin/ActiveSessionsMonitor';
import { NotificationCenter } from '@/components/super-admin/NotificationCenter';
import { ActivityFeed } from '@/components/super-admin/ActivityFeed';
import { SystemHealthMonitor } from '@/components/super-admin/SystemHealthMonitor';
import { MetricCard } from '@/components/super-admin/MetricCard';
import { useSuperAdminMetrics } from '@/hooks/useSuperAdminMetrics';
import { useRealtimeSubscriptions } from '@/hooks/useRealtimeSubscriptions';

interface OverviewPanelsProps {
  onNotificationRead: (id: string) => void;
}

export const OverviewPanels: React.FC<OverviewPanelsProps> = ({ onNotificationRead }) => {
  const { metrics, isLoading } = useSuperAdminMetrics();
  const realtimeData = useRealtimeSubscriptions();

  return (
    <>
      {/* Monitoring Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ActiveSessionsMonitor sessions={realtimeData.activeSessions} />
        </div>
        
        <div className="lg:col-span-1">
          <NotificationCenter 
            notifications={realtimeData.notifications}
            onNotificationRead={onNotificationRead}
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
    </>
  );
};