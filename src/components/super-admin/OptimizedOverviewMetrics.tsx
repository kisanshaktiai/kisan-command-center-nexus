
import React from 'react';
import { Users, Building, Activity, Shield, DollarSign } from 'lucide-react';
import { MetricCard } from '@/components/super-admin/MetricCard';
import { useOptimizedAdminDashboard } from '@/hooks/useOptimizedAdminDashboard';
import { Skeleton } from '@/components/ui/skeleton';

export const OptimizedOverviewMetrics: React.FC = () => {
  const { data, isLoading } = useOptimizedAdminDashboard();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-6 border rounded-lg">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return <div>No data available</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <MetricCard
        title="Total Tenants"
        value={data.totalTenants}
        icon={Building}
        gradient="from-blue-500/10 to-blue-600/20"
        iconColor="bg-gradient-to-r from-blue-500 to-blue-600"
        loading={false}
      />
      
      <MetricCard
        title="Active Sessions"
        value={data.activeSessions.length}
        icon={Users}
        gradient="from-green-500/10 to-green-600/20"
        iconColor="bg-gradient-to-r from-green-500 to-green-600"
        loading={false}
      />
      
      <MetricCard
        title="API Calls (24h)"
        value={data.totalApiCalls}
        icon={Activity}
        gradient="from-purple-500/10 to-purple-600/20"
        iconColor="bg-gradient-to-r from-purple-500 to-purple-600"
        loading={false}
      />
      
      <MetricCard
        title="System Health"
        value={`${data.systemHealth}%`}
        icon={Shield}
        gradient="from-emerald-500/10 to-emerald-600/20"
        iconColor="bg-gradient-to-r from-emerald-500 to-emerald-600"
        loading={false}
      />
      
      <MetricCard
        title="Revenue (Monthly)"
        value={`$${data.monthlyRevenue.toLocaleString()}`}
        icon={DollarSign}
        gradient="from-amber-500/10 to-amber-600/20"
        iconColor="bg-gradient-to-r from-amber-500 to-amber-600"
        loading={false}
      />
    </div>
  );
};
