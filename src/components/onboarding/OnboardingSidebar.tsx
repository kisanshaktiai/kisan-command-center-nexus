
import React from 'react';
import { useOnboarding } from './OnboardingProvider';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const OnboardingSidebar: React.FC = () => {
  const { 
    steps, 
    state: { currentStepIndex }, 
    goToStep 
  } = useOnboarding();

  const getStatusIcon = (status: string, isActive: boolean) => {
    const iconClass = cn("w-4 h-4", {
      "animate-pulse": isActive
    });

    switch (status) {
      case 'completed':
        return <CheckCircle className={cn(iconClass, "text-green-500")} />;
      case 'in_progress':
        return <Clock className={cn(iconClass, "text-blue-500")} />;
      case 'failed':
        return <AlertCircle className={cn(iconClass, "text-red-500")} />;
      default:
        return <Circle className={cn(iconClass, "text-muted-foreground")} />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default' as const,
      in_progress: 'secondary' as const,
      failed: 'destructive' as const,
      pending: 'outline' as const
    };
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'} className="text-xs">
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="w-96 border-r bg-muted/30 overflow-y-auto">
      <div className="p-6">
        <div className="sticky top-0 bg-muted/30 pb-4 mb-6">
          <h3 className="font-semibold text-base text-muted-foreground uppercase tracking-wide">
            Onboarding Journey
          </h3>
        </div>
        
        <div className="space-y-3">
          {steps.map((step, index) => {
            const isActive = index === currentStepIndex;
            const stepData = step.step_data || {};
            const isClickable = Math.abs(index - currentStepIndex) <= 1 || step.step_status === 'completed';
            
            return (
              <div
                key={step.id}
                className={cn(
                  "group relative p-5 rounded-xl border-2 transition-all duration-300",
                  "hover:shadow-lg cursor-pointer",
                  {
                    "border-primary bg-primary/10 shadow-md scale-[1.02]": isActive,
                    "border-green-200 bg-green-50/70 hover:bg-green-100/70": step.step_status === 'completed',
                    "border-border bg-background hover:bg-muted/50": !isActive && step.step_status !== 'completed',
                    "cursor-not-allowed opacity-60": !isClickable
                  }
                )}
                onClick={() => isClickable && goToStep(index)}
              >
                {/* Connection line */}
                {index < steps.length - 1 && (
                  <div className={cn(
                    "absolute left-8 top-20 w-0.5 h-6 transition-colors",
                    step.step_status === 'completed' ? "bg-green-400" : "bg-border"
                  )} />
                )}
                
                <div className="flex items-start gap-4">
                  <div className="relative flex-shrink-0">
                    {getStatusIcon(step.step_status, isActive)}
                    {isActive && (
                      <div className="absolute -inset-2 rounded-full bg-primary/10 animate-pulse" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-base truncate">{step.step_name}</h4>
                        {stepData.required && (
                          <Badge variant="secondary" className="text-xs px-2 py-0.5">Required</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {stepData.description || `Step ${step.step_number} of the onboarding process`}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      {getStatusBadge(step.step_status)}
                      <span className="text-xs text-muted-foreground font-medium">
                        ~{stepData.estimated_time || 15}min
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
