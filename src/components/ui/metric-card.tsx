
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value?: string | number;
  unit?: string;
  change?: number;
  status?: 'healthy' | 'warning' | 'critical' | 'normal';
  loading?: boolean;
  icon?: React.ReactNode;
  description?: string;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  change,
  status = 'normal',
  loading = false,
  icon,
  description,
  className
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'normal':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getChangeColor = (change?: number) => {
    if (change === undefined) return '';
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          {icon && <Skeleton className="h-4 w-4" />}
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex items-center gap-2">
          {status !== 'normal' && (
            <Badge className={cn("text-xs", getStatusColor(status))}>
              {status}
            </Badge>
          )}
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value}
          {unit && <span className="text-sm text-muted-foreground ml-1">{unit}</span>}
        </div>
        {(description || change !== undefined) && (
          <div className="flex items-center justify-between mt-2">
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {change !== undefined && (
              <p className={cn("text-xs font-medium", getChangeColor(change))}>
                {change >= 0 ? '+' : ''}{change.toFixed(1)}%
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
