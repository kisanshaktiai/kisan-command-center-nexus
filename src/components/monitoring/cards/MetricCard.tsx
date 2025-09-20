import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AnimatedDelta } from '../AnimatedDelta';
import { SparklineChart } from '../SparklineChart';
import { Skeleton } from '@/components/ui/skeleton';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number;
  previousValue?: number;
  format?: 'percent' | 'number' | 'currency';
  prefix?: string;
  suffix?: string;
  icon?: LucideIcon;
  iconColor?: string;
  gradient?: string;
  sparklineData?: number[];
  sparklineColor?: string;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  previousValue,
  format = 'number',
  prefix = '',
  suffix = '',
  icon: Icon,
  iconColor = 'hsl(var(--primary))',
  gradient,
  sparklineData,
  sparklineColor,
  loading = false,
  className = '',
  onClick
}) => {
  if (loading) {
    return (
      <Card className={cn('relative overflow-hidden', className)}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
            </div>
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        'relative overflow-hidden transition-all duration-300',
        'hover:scale-[1.02] hover:shadow-xl',
        'backdrop-blur-sm bg-card/95 border-border/50',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {gradient && (
        <div 
          className="absolute inset-0 opacity-5"
          style={{ background: gradient }}
        />
      )}
      
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>
            
            <AnimatedDelta
              value={value}
              previousValue={previousValue}
              format={format}
              prefix={prefix}
              suffix={suffix}
              className="text-2xl font-bold"
            />
            
            {sparklineData && sparklineData.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <SparklineChart
                  data={sparklineData}
                  color={sparklineColor || iconColor}
                  width={120}
                  height={40}
                  showDot={true}
                />
              </div>
            )}
          </div>
          
          {Icon && (
            <div 
              className="p-2.5 rounded-lg bg-gradient-to-br from-background to-muted/50"
              style={{ 
                background: `linear-gradient(135deg, ${iconColor}15, ${iconColor}05)`,
                borderColor: `${iconColor}20`,
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            >
              <Icon 
                className="h-5 w-5"
                style={{ color: iconColor }}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};