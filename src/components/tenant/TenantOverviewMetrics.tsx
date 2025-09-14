
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building, Clock, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { Tenant } from '@/types/tenant';

interface TenantOverviewMetricsProps {
  tenants: Tenant[];
  isLoading?: boolean;
}

export const TenantOverviewMetrics: React.FC<TenantOverviewMetricsProps> = ({
  tenants,
  isLoading = false
}) => {
  const metrics = React.useMemo(() => {
    if (!tenants || tenants.length === 0) {
      return {
        total: 0,
        active: 0,
        trial: 0,
        suspended: 0,
        revenue: 0,
        growth: 0
      };
    }

    const total = tenants.length;
    const active = tenants.filter(t => t.status === 'active').length;
    const trial = tenants.filter(t => t.status === 'trial').length;
    const suspended = tenants.filter(t => t.status === 'suspended').length;
    
    // Calculate approximate revenue based on subscription plans
    const revenue = tenants.reduce((sum, tenant) => {
      const planRevenue = {
        'Kisan_Basic': 99,
        'Shakti_Growth': 299,
        'AI_Enterprise': 999,
        'Custom': 1999
      };
      return sum + (planRevenue[tenant.subscription_plan as keyof typeof planRevenue] || 0);
    }, 0);

    // Calculate growth (simplified - based on recent creations)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentTenants = tenants.filter(t => new Date(t.created_at) > thirtyDaysAgo).length;
    const growth = total > 0 ? Math.round((recentTenants / total) * 100) : 0;

    return { total, active, trial, suspended, revenue, growth };
  }, [tenants]);

  const MetricCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    color = "default" 
  }: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    trend?: string;
    color?: "default" | "success" | "warning" | "danger";
  }) => {
    const colorClasses = {
      default: "text-muted-foreground",
      success: "text-green-600",
      warning: "text-yellow-600",
      danger: "text-red-600"
    };

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className={`h-4 w-4 ${colorClasses[color]}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isLoading ? "..." : value}
          </div>
          {trend && (
            <p className="text-xs text-muted-foreground mt-1">
              {trend}
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6 mb-6">
      <MetricCard
        title="Total Tenants"
        value={metrics.total}
        icon={Building}
        trend={`${metrics.growth}% growth this month`}
      />
      <MetricCard
        title="Active Tenants"
        value={metrics.active}
        icon={Users}
        color="success"
        trend={`${Math.round((metrics.active / metrics.total) * 100) || 0}% of total`}
      />
      <MetricCard
        title="Trial Tenants"
        value={metrics.trial}
        icon={Clock}
        color="warning"
        trend={`${Math.round((metrics.trial / metrics.total) * 100) || 0}% of total`}
      />
      <MetricCard
        title="Suspended"
        value={metrics.suspended}
        icon={AlertTriangle}
        color="danger"
        trend={`${Math.round((metrics.suspended / metrics.total) * 100) || 0}% of total`}
      />
      <MetricCard
        title="Monthly Revenue"
        value={`$${metrics.revenue}`}
        icon={DollarSign}
        color="success"
        trend="Estimated monthly"
      />
      <MetricCard
        title="Growth Rate"
        value={`${metrics.growth}%`}
        icon={TrendingUp}
        trend="Last 30 days"
      />
    </div>
  );
};
