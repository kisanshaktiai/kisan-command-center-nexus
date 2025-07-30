
import React from 'react';
import { 
  Users, 
  Building, 
  Activity, 
  Shield, 
  DollarSign
} from 'lucide-react';
import { MetricCard } from '@/components/super-admin/MetricCard';
import { useSuperAdminMetrics } from '@/hooks/useSuperAdminMetrics';
import { useRealtimeSubscriptions } from '@/hooks/useRealtimeSubscriptions';
import { formatCurrency, formatCompactCurrency } from '@/lib/currency';

export const RealTimeOverviewMetrics: React.FC = () => {
  const { metrics, isLoading, getMetricChange } = useSuperAdminMetrics();
  const realtimeData = useRealtimeSubscriptions();

  // Prioritize real-time data over cached metrics
  const latestSystemMetric = realtimeData.systemMetrics[0];
  const latestFinancialMetric = realtimeData.financialMetrics[0];

  // Use real-time data first, fallback to metrics hook data
  const liveSystemHealth = latestSystemMetric?.health_score || 
                          latestSystemMetric?.value || 
                          metrics?.systemHealth || 
                          95;
  
  const liveRevenue = latestFinancialMetric?.monthly_recurring_revenue || 
                     latestFinancialMetric?.amount || 
                     metrics?.monthlyRevenue || 
                     0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <MetricCard
        title="Total Tenant Count"
        value={realtimeData.tenants.length || metrics?.totalTenants || 0}
        change={getMetricChange(realtimeData.tenants.length || metrics?.totalTenants || 0, 'totalTenants')}
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
  );
};
