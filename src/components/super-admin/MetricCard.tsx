
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
    period?: string;
  };
  icon: LucideIcon;
  gradient: string;
  iconColor: string;
  loading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  gradient,
  iconColor,
  loading = false
}) => {
  return (
    <Card className={cn(
      "group relative overflow-hidden border-0 shadow-lg transition-all duration-500",
      "hover:shadow-2xl hover:scale-[1.02] transform-gpu",
      "bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm",
      gradient
    )}>
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-y-12 translate-x-full group-hover:translate-x-[-100%] transition-transform duration-1000" />
      </div>
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <p className="text-sm font-medium text-slate-600 group-hover:text-slate-700 transition-colors">
            {title}
          </p>
        </div>
        <div className={cn(
          "p-3 rounded-xl transition-all duration-300 group-hover:scale-110",
          "shadow-lg group-hover:shadow-xl",
          iconColor
        )}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2">
          {loading ? (
            <div className="animate-pulse">
              <div className="h-8 bg-slate-200 rounded w-24"></div>
            </div>
          ) : (
            <div className="text-3xl font-bold text-slate-800 animate-fade-in">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
          )}
          
          {change && !loading && (
            <div className="flex items-center gap-1">
              <span className={cn(
                "text-xs font-medium flex items-center",
                change.type === 'increase' ? "text-green-600" : "text-red-600"
              )}>
                {change.type === 'increase' ? '↗' : '↘'} {Math.abs(change.value)}%
              </span>
              {change.period && (
                <span className="text-xs text-slate-500">vs {change.period}</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
