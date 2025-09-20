import React, { useEffect, useState } from 'react';
import { Building, DollarSign, Shield, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSuperAdminMetrics } from '@/hooks/useSuperAdminMetrics';
import { useRealtimeSubscriptions } from '@/hooks/useRealtimeSubscriptions';
import { formatCompactCurrency } from '@/lib/currency';

interface AnimatedNumber {
  value: number;
  displayValue: string;
}

const AnimatedCounter: React.FC<{ target: number; format?: (n: number) => string }> = ({ 
  target, 
  format = (n) => n.toString() 
}) => {
  const [current, setCurrent] = useState(0);
  
  useEffect(() => {
    const duration = 1000;
    const steps = 60;
    const increment = target / steps;
    let currentStep = 0;
    
    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setCurrent(target);
        clearInterval(timer);
      } else {
        setCurrent(Math.floor(increment * currentStep));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [target]);
  
  return <span>{format(current)}</span>;
};

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.FC<{ className?: string }>;
  change?: { value: number; type: 'increase' | 'decrease' };
  color: 'blue' | 'green' | 'purple' | 'amber';
  isAnimated?: boolean;
  formatter?: (n: number) => string;
}

const HeroMetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  change, 
  color,
  isAnimated = true,
  formatter
}) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600'
  };

  const bgColorClasses = {
    blue: 'bg-blue-500/10 dark:bg-blue-500/20',
    green: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    purple: 'bg-purple-500/10 dark:bg-purple-500/20',
    amber: 'bg-amber-500/10 dark:bg-amber-500/20'
  };

  const iconBgClasses = {
    blue: 'bg-gradient-to-br from-blue-500 to-blue-600',
    green: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    purple: 'bg-gradient-to-br from-purple-500 to-purple-600',
    amber: 'bg-gradient-to-br from-amber-500 to-amber-600'
  };

  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;

  return (
    <div className={cn(
      "relative group overflow-hidden",
      "bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl",
      "border border-slate-200/50 dark:border-slate-700/50",
      "rounded-2xl p-6",
      "hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-slate-950/50",
      "transition-all duration-500 hover:scale-[1.02]"
    )}>
      {/* Glassmorphism gradient overlay */}
      <div className={cn(
        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
        "bg-gradient-to-br",
        bgColorClasses[color]
      )} />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "p-3 rounded-xl shadow-lg",
            iconBgClasses[color]
          )}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          
          {change && (
            <div className={cn(
              "flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium",
              change.type === 'increase' 
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" 
                : "bg-red-500/10 text-red-700 dark:text-red-400"
            )}>
              <span>{change.type === 'increase' ? '↑' : '↓'}</span>
              <span>{Math.abs(change.value).toFixed(1)}%</span>
            </div>
          )}
        </div>
        
        <div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            {isAnimated && typeof numericValue === 'number' ? (
              <AnimatedCounter target={numericValue} format={formatter || ((n) => n.toString())} />
            ) : (
              value
            )}
          </p>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className={cn(
        "absolute -bottom-8 -right-8 w-24 h-24 rounded-full opacity-10",
        "bg-gradient-to-br",
        colorClasses[color]
      )} />
    </div>
  );
};

export const ModernHeroMetrics: React.FC = () => {
  const { metrics, isLoading, getMetricChange } = useSuperAdminMetrics();
  const realtimeData = useRealtimeSubscriptions();

  // Use real-time data with fallback to cached metrics
  const totalTenants = realtimeData.tenants.length > 0 ? realtimeData.tenants.length : (metrics?.totalTenants || 0);
  const activeSessions = realtimeData.activeSessions.length;
  const monthlyRevenue = realtimeData.financialMetrics.length > 0 
    ? realtimeData.financialMetrics.reduce((sum, m) => sum + (m.revenue || 0), 0)
    : (metrics?.monthlyRevenue || 0);
  const systemHealth = realtimeData.systemMetrics.length > 0 
    ? (realtimeData.systemMetrics[0]?.health_score || metrics?.systemHealth || 95)
    : (metrics?.systemHealth || 95);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <HeroMetricCard
        title="Total Tenants"
        value={totalTenants}
        icon={Building}
        change={getMetricChange(totalTenants, 'totalTenants')}
        color="blue"
      />
      
      <HeroMetricCard
        title="Monthly Revenue"
        value={formatCompactCurrency(monthlyRevenue)}
        icon={DollarSign}
        change={getMetricChange(monthlyRevenue, 'monthlyRevenue')}
        color="amber"
        isAnimated={false}
      />
      
      <HeroMetricCard
        title="System Health"
        value={`${Math.round(systemHealth)}%`}
        icon={Shield}
        change={getMetricChange(systemHealth, 'systemHealth')}
        color="green"
        isAnimated={false}
      />
      
      <HeroMetricCard
        title="Active Sessions"
        value={activeSessions}
        icon={Users}
        color="purple"
      />
    </div>
  );
};