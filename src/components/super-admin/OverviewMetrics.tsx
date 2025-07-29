import React from 'react';
import { Users, Building, Activity, Shield, DollarSign } from 'lucide-react';
import { MetricCard } from '@/components/super-admin/MetricCard';
import { useSuperAdminMetrics } from '@/hooks/useSuperAdminMetrics';
import { useRealtimeSubscriptions } from '@/hooks/useRealtimeSubscriptions';

export const OverviewMetrics: React.FC = () => {
  const { metrics, isLoading, getMetricChange } = useSuperAdminMetrics();
  const realtimeData = useRealtimeSubscriptions();

  return (
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
  );
};