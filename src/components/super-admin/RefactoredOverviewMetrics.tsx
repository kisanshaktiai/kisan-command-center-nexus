
import React from 'react';
import { Users, Building, Activity, Shield, DollarSign } from 'lucide-react';
import { PureMetricCard } from '@/components/ui/metric-card-pure';
import { useSuperAdminMetrics } from '@/hooks/useSuperAdminMetrics';
import { useRealtimeSubscriptions } from '@/hooks/useRealtimeSubscriptions';
import { MetricsFormatters } from '@/domain/metrics/formatters';

export const RefactoredOverviewMetrics: React.FC = () => {
  const { metrics, isLoading, getMetricChange } = useSuperAdminMetrics();
  const realtimeData = useRealtimeSubscriptions();

  // Calculate derived values using business logic
  const totalTenants = realtimeData.tenants.length;
  const activeSessions = realtimeData.activeSessions.length;
  const apiCalls = realtimeData.apiUsage.length;
  const systemHealth = metrics?.systemHealth || 0;
  const monthlyRevenue = metrics?.monthlyRevenue || 0;

  // Format values using domain formatters with new currency system
  const formattedRevenue = MetricsFormatters.formatCurrency(monthlyRevenue, { compact: true });
  const formattedHealth = MetricsFormatters.formatPercentage(systemHealth);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <PureMetricCard
        title="Total Tenant Count"
        value={totalTenants}
        change={getMetricChange(totalTenants, 'totalTenants')}
        icon={Building}
        gradient="from-blue-500/10 to-blue-600/20"
        iconColor="bg-gradient-to-r from-blue-500 to-blue-600"
        loading={isLoading}
      />
      
      <PureMetricCard
        title="Active Sessions"
        value={activeSessions}
        icon={Users}
        gradient="from-green-500/10 to-green-600/20"
        iconColor="bg-gradient-to-r from-green-500 to-green-600"
        loading={isLoading}
      />
      
      <PureMetricCard
        title="API Calls (24h)"
        value={MetricsFormatters.formatCompactNumber(apiCalls)}
        icon={Activity}
        gradient="from-purple-500/10 to-purple-600/20"
        iconColor="bg-gradient-to-r from-purple-500 to-purple-600"
        loading={isLoading}
      />
      
      <PureMetricCard
        title="System Health"
        value={formattedHealth}
        change={getMetricChange(systemHealth, 'systemHealth')}
        icon={Shield}
        gradient="from-emerald-500/10 to-emerald-600/20"
        iconColor="bg-gradient-to-r from-emerald-500 to-emerald-600"
        loading={isLoading}
      />
      
      <PureMetricCard
        title="Revenue (Monthly)"
        value={formattedRevenue}
        change={getMetricChange(monthlyRevenue, 'monthlyRevenue')}
        icon={DollarSign}
        gradient="from-amber-500/10 to-amber-600/20"
        iconColor="bg-gradient-to-r from-amber-500 to-amber-600"
        loading={isLoading}
      />
    </div>
  );
};
