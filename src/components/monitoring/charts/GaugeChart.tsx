import React from 'react';
import { cn } from '@/lib/utils';

interface GaugeChartProps {
  value: number;
  max?: number;
  label: string;
  unit?: string;
  thresholds?: {
    warning: number;
    critical: number;
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const GaugeChart: React.FC<GaugeChartProps> = ({
  value,
  max = 100,
  label,
  unit = '%',
  thresholds = { warning: 70, critical: 90 },
  size = 'md',
  className = ''
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  const rotation = (percentage * 180) / 100 - 90;
  
  const getColor = () => {
    if (percentage >= thresholds.critical) return 'hsl(var(--destructive))';
    if (percentage >= thresholds.warning) return 'hsl(var(--warning))';
    return 'hsl(var(--primary))';
  };

  const getGradient = () => {
    if (percentage >= thresholds.critical) return 'url(#gauge-gradient-critical)';
    if (percentage >= thresholds.warning) return 'url(#gauge-gradient-warning)';
    return 'url(#gauge-gradient-success)';
  };

  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-32 h-32',
    lg: 'w-40 h-40'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  return (
    <div className={cn('relative', sizeClasses[size], className)}>
      <svg className="w-full h-full transform -rotate-90">
        <defs>
          <linearGradient id="gauge-gradient-success" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(var(--primary))" />
          </linearGradient>
          <linearGradient id="gauge-gradient-warning" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--warning))" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(var(--warning))" />
          </linearGradient>
          <linearGradient id="gauge-gradient-critical" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(var(--destructive))" />
          </linearGradient>
        </defs>
        
        <circle
          cx="50%"
          cy="50%"
          r="45%"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="10"
          strokeDasharray="283"
          strokeDashoffset="141.5"
          opacity="0.2"
        />
        <circle
          cx="50%"
          cy="50%"
          r="45%"
          fill="none"
          stroke={getGradient()}
          strokeWidth="10"
          strokeDasharray="283"
          strokeDashoffset={141.5 - (141.5 * percentage) / 100}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out filter drop-shadow-sm"
        />
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={cn('font-bold text-foreground', textSizes[size])}>
          {value.toFixed(0)}{unit}
        </div>
        <div className="text-xs text-muted-foreground mt-1 font-medium">
          {label}
        </div>
      </div>
    </div>
  );
};