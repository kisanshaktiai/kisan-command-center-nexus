
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface MetricChange {
  value: number;
  type: 'increase' | 'decrease';
  period?: string;
}

interface OptimizedMetricCardProps {
  title: string;
  value: string | number;
  change?: MetricChange;
  icon: LucideIcon;
  gradient: string;
  iconColor: string;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
  textColor?: 'white' | 'default';
}

export const OptimizedMetricCard = React.memo<OptimizedMetricCardProps>(({
  title,
  value,
  change,
  icon: Icon,
  gradient,
  iconColor,
  loading = false,
  className = '',
  onClick,
  textColor = 'default'
}) => {
  if (loading) {
    return (
      <Card className={cn("relative overflow-hidden", className)}>
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
        <CardContent className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const titleColor = textColor === 'white' ? 'text-white/90' : 'text-gray-600';
  const valueColor = textColor === 'white' ? 'text-white' : 'text-gray-900';

  return (
    <Card 
      className={cn(
        "relative overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      <CardContent className="relative p-6">
        <div className="flex items-center justify-between mb-4">
          <p className={cn("text-sm font-medium", titleColor)}>{title}</p>
          <div className={cn("p-2 rounded-full shadow-lg", iconColor)}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
        <div className="space-y-1">
          <p className={cn("text-2xl font-bold", valueColor)}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {change && (
            <p className={cn(
              "text-xs",
              change.type === 'increase' ? 'text-green-600' : 'text-red-600'
            )}>
              {change.type === 'increase' ? '↗' : '↘'} {change.value}%
              {change.period && ` vs ${change.period}`}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

OptimizedMetricCard.displayName = 'OptimizedMetricCard';
