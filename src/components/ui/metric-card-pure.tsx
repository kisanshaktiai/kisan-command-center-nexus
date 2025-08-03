
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface MetricChange {
  value: number;
  type: 'increase' | 'decrease';
  period?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: MetricChange;
  icon: LucideIcon;
  gradient: string;
  iconColor: string;
  loading?: boolean;
  className?: string;
}

export const PureMetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  gradient,
  iconColor,
  loading = false,
  className = ''
}) => {
  if (loading) {
    return (
      <Card className={`relative overflow-hidden ${className}`}>
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

  return (
    <Card className={`relative overflow-hidden hover:shadow-lg transition-shadow ${className}`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      <CardContent className="relative p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className={`p-2 rounded-full ${iconColor} shadow-lg`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <p className={`text-xs ${change.type === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
              {change.type === 'increase' ? '↗' : '↘'} {change.value}%
              {change.period && ` vs ${change.period}`}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
