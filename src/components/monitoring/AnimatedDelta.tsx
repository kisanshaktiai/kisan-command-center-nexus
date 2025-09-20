import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface AnimatedDeltaProps {
  value: number;
  previousValue?: number;
  format?: 'percent' | 'number' | 'currency';
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const AnimatedDelta: React.FC<AnimatedDeltaProps> = ({
  value,
  previousValue,
  format = 'number',
  prefix = '',
  suffix = '',
  className = ''
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  
  useEffect(() => {
    if (previousValue !== undefined && value !== previousValue) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [value, previousValue]);

  const delta = previousValue !== undefined ? value - previousValue : 0;
  const deltaPercent = previousValue ? ((delta / previousValue) * 100).toFixed(1) : '0';
  
  const formatValue = (val: number) => {
    switch (format) {
      case 'percent':
        return `${val.toFixed(1)}%`;
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        }).format(val);
      default:
        return val.toFixed(1);
    }
  };

  const getDeltaColor = () => {
    if (delta > 0) return 'text-success';
    if (delta < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const getDeltaIcon = () => {
    if (delta > 0) return <TrendingUp className="h-3 w-3" />;
    if (delta < 0) return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span
        className={`font-semibold transition-all duration-300 ${
          isAnimating ? 'scale-110 text-primary' : ''
        }`}
      >
        {prefix}{formatValue(value)}{suffix}
      </span>
      
      {previousValue !== undefined && delta !== 0 && (
        <span
          className={`flex items-center gap-0.5 text-xs ${getDeltaColor()} ${
            isAnimating ? 'animate-slide-in-right' : ''
          }`}
        >
          {getDeltaIcon()}
          <span>{deltaPercent}%</span>
        </span>
      )}
    </div>
  );
};