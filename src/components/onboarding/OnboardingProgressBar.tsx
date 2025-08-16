
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, Play } from 'lucide-react';

interface OnboardingProgressBarProps {
  progress: number;
  currentStep: number;
  totalSteps: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
}

export const OnboardingProgressBar: React.FC<OnboardingProgressBarProps> = ({
  progress,
  currentStep,
  totalSteps,
  status
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Play className="h-4 w-4 text-gray-400" />;
    }
  };

  const getProgressColor = () => {
    if (status === 'completed') return 'bg-green-500';
    if (status === 'failed') return 'bg-red-500';
    return 'bg-blue-500';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm font-medium">
            Overall Progress
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {currentStep} of {totalSteps} steps
          </span>
          <Badge 
            variant={
              status === 'completed' ? 'default' :
              status === 'in_progress' ? 'secondary' :
              status === 'failed' ? 'destructive' : 'outline'
            }
            className="capitalize"
          >
            {status.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      <div className="space-y-2">
        <Progress 
          value={progress} 
          className="h-2"
          aria-label={`Onboarding progress: ${progress}%`}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0%</span>
          <span className="font-medium">{progress}% Complete</span>
          <span>100%</span>
        </div>
      </div>

      {status === 'failed' && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
          ⚠️ Onboarding workflow has failed steps that need attention
        </div>
      )}

      {status === 'completed' && (
        <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md p-2">
          🎉 Onboarding workflow completed successfully!
        </div>
      )}
    </div>
  );
};
