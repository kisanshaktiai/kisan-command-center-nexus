import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Line, LineChart, ResponsiveContainer } from 'recharts';

interface CompactMetricCardProps {
  title: string;
  value: number | string;
  data: Array<{ value: number; timestamp: string }>;
  icon: React.FC<{ className?: string }>;
  trend?: number;
  color: 'blue' | 'violet' | 'emerald' | 'amber';
}

export const CompactMetricCard: React.FC<CompactMetricCardProps> = ({
  title,
  value,
  data,
  icon: Icon,
  trend,
  color
}) => {
  const colorConfig = {
    blue: {
      bg: 'bg-blue-500/10 dark:bg-blue-500/20',
      iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
      chart: '#3b82f6'
    },
    violet: {
      bg: 'bg-violet-500/10 dark:bg-violet-500/20',
      iconBg: 'bg-gradient-to-br from-violet-500 to-violet-600',
      chart: '#8b5cf6'
    },
    emerald: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      chart: '#10b981'
    },
    amber: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      iconBg: 'bg-gradient-to-br from-amber-500 to-amber-600',
      chart: '#f59e0b'
    }
  };

  const config = colorConfig[color];

  return (
    <Card className={cn(
      "border-0 shadow-xl overflow-hidden",
      "bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl",
      "hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2.5 rounded-xl shadow-lg", config.iconBg)}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {title}
              </p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-1">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </p>
            </div>
          </div>
          
          {trend !== undefined && (
            <div className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold",
              trend > 0 
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-red-500/10 text-red-700 dark:text-red-400"
            )}>
              {trend > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{Math.abs(trend).toFixed(1)}%</span>
            </div>
          )}
        </div>
        
        {/* Sparkline Chart */}
        <div className="h-16 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={config.chart}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};