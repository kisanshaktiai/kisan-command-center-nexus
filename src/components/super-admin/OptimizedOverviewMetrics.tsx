
import React from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { useSystemMetrics, useFinancialMetrics, useResourceMetrics } from '@/data/hooks/useMetrics';
import { Activity, DollarSign, Users, Server } from 'lucide-react';

export const OptimizedOverviewMetrics: React.FC = () => {
  const { data: systemMetrics, isLoading: systemLoading } = useSystemMetrics();
  const { data: financialMetrics, isLoading: financialLoading } = useFinancialMetrics();
  const { data: resourceMetrics, isLoading: resourceLoading } = useResourceMetrics();

  // Calculate aggregated metrics
  const totalRevenue = financialMetrics?.reduce((sum, metric) => 
    metric.category === 'revenue' ? sum + metric.amount : sum, 0) || 0;
  
  const avgCpuUsage = resourceMetrics?.find(r => r.resource_type === 'cpu')?.usage_percentage || 0;
  const systemHealthScore = systemMetrics?.filter(m => m.status === 'healthy').length || 0;
  const activeServices = systemMetrics?.length || 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Revenue"
        value={totalRevenue.toLocaleString()}
        unit="USD"
        loading={financialLoading}
        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        description="This month"
      />
      
      <MetricCard
        title="System Health"
        value={systemHealthScore}
        unit={`/${activeServices}`}
        status={systemHealthScore === activeServices ? 'healthy' : 'warning'}
        loading={systemLoading}
        icon={<Activity className="h-4 w-4 text-muted-foreground" />}
        description="Services healthy"
      />
      
      <MetricCard
        title="CPU Usage"
        value={avgCpuUsage.toFixed(1)}
        unit="%"
        status={avgCpuUsage > 80 ? 'critical' : avgCpuUsage > 60 ? 'warning' : 'healthy'}
        loading={resourceLoading}
        icon={<Server className="h-4 w-4 text-muted-foreground" />}
        description="Average across servers"
      />
      
      <MetricCard
        title="Active Tenants"
        value="156"
        change={12.5}
        loading={false}
        icon={<Users className="h-4 w-4 text-muted-foreground" />}
        description="vs last month"
      />
    </div>
  );
};
