
import React from 'react';
import { Users, Building, Activity, Shield, DollarSign } from 'lucide-react';
import { MetricCard } from '@/components/super-admin/MetricCard';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';

export const OptimizedOverviewMetrics: React.FC = () => {
  const { data: dashboardData, isLoading, getMetricChange } = useAdminDashboard();

  if (!dashboardData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <MetricCard
        title="Total Tenants"
        value={dashboardData.totalTenants}
        change={getMetricChange(dashboardData.totalTenants, 'totalTenants')}
        icon={Building}
        gradient="from-blue-500/10 to-blue-600/20"
        iconColor="bg-gradient-to-r from-blue-500 to-blue-600"
        loading={isLoading}
      />
      
      <MetricCard
        title="Active Sessions"
        value={dashboardData.activeSessions.length}
        icon={Users}
        gradient="from-green-500/10 to-green-600/20"
        iconColor="bg-gradient-to-r from-green-500 to-green-600"
        loading={isLoading}
      />
      
      <MetricCard
        title="API Calls (24h)"
        value={dashboardData.totalApiCalls}
        icon={Activity}
        gradient="from-purple-500/10 to-purple-600/20"
        iconColor="bg-gradient-to-r from-purple-500 to-purple-600"
        loading={isLoading}
      />
      
      <MetricCard
        title="System Health"
        value={`${dashboardData.systemHealth}%`}
        change={getMetricChange(dashboardData.systemHealth, 'systemHealth')}
        icon={Shield}
        gradient="from-emerald-500/10 to-emerald-600/20"
        iconColor="bg-gradient-to-r from-emerald-500 to-emerald-600"
        loading={isLoading}
      />
      
      <MetricCard
        title="Revenue (Monthly)"
        value={`$${dashboardData.monthlyRevenue.toLocaleString()}`}
        change={getMetricChange(dashboardData.monthlyRevenue, 'monthlyRevenue')}
        icon={DollarSign}
        gradient="from-amber-500/10 to-amber-600/20"
        iconColor="bg-gradient-to-r from-amber-500 to-amber-600"
        loading={isLoading}
      />
    </div>
  );
};
