
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface UsageMeterProps {
  label: string;
  current: number;
  limit: number;
  unit?: string;
  colorScheme?: 'default' | 'success' | 'warning' | 'danger';
  showDetails?: boolean;
}

export const UsageMeter: React.FC<UsageMeterProps> = ({
  label,
  current,
  limit,
  unit = '',
  colorScheme = 'default',
  showDetails = true,
}) => {
  const percentage = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  
  const getColorScheme = () => {
    if (colorScheme !== 'default') return colorScheme;
    if (percentage >= 90) return 'danger';
    if (percentage >= 75) return 'warning';
    return 'success';
  };

  const currentScheme = getColorScheme();
  
  const getIcon = () => {
    switch (currentScheme) {
      case 'danger':
        return <AlertTriangle className="h-3 w-3 text-destructive" />;
      case 'warning':
        return <Clock className="h-3 w-3 text-warning" />;
      case 'success':
        return <CheckCircle className="h-3 w-3 text-success" />;
      default:
        return null;
    }
  };

  const getProgressColor = () => {
    switch (currentScheme) {
      case 'danger':
        return 'bg-destructive';
      case 'warning':
        return 'bg-warning';
      case 'success':
        return 'bg-success';
      default:
        return 'bg-primary';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {getIcon()}
          <span className="text-sm font-medium">{label}</span>
        </div>
        {showDetails && (
          <Badge variant="outline" className="text-xs">
            {percentage.toFixed(0)}%
          </Badge>
        )}
      </div>
      
      <div className="space-y-1">
        <Progress 
          value={percentage} 
          className={`h-2 ${getProgressColor()}`}
        />
        {showDetails && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{current.toLocaleString()}{unit}</span>
            <span>{limit.toLocaleString()}{unit} limit</span>
          </div>
        )}
      </div>
    </div>
  );
};
