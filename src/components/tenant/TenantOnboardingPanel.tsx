
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Clock, PlayCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OnboardingStep {
  id: string;
  tenant_id: string;
  step_name: string;
  step_order: number;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  step_data: any;
  created_at: string;
  updated_at: string;
}

interface TenantOnboardingPanelProps {
  tenantId: string;
  tenantName: string;
}

export const TenantOnboardingPanel: React.FC<TenantOnboardingPanelProps> = ({
  tenantId,
  tenantName,
}) => {
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch onboarding steps
  const { data: steps = [], isLoading } = useQuery({
    queryKey: ['tenant-onboarding', tenantId],
    queryFn: async (): Promise<OnboardingStep[]> => {
      const { data, error } = await supabase
        .from('tenant_onboarding_steps')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('step_order');

      if (error) throw error;
      return data || [];
    },
  });

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('onboarding-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tenant_onboarding_steps',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          console.log('Onboarding step updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['tenant-onboarding', tenantId] });
          
          if (payload.eventType === 'UPDATE' && payload.new.is_completed) {
            toast.success(`Step "${payload.new.step_name}" completed!`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  const toggleStepCompletion = async (stepId: string, currentStatus: boolean) => {
    setIsUpdating(stepId);
    try {
      const { error } = await supabase
        .from('tenant_onboarding_steps')
        .update({
          is_completed: !currentStatus,
          completed_at: !currentStatus ? new Date().toISOString() : null,
          completed_by: !currentStatus ? 'admin_user' : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', stepId);

      if (error) throw error;

      toast.success(`Step ${!currentStatus ? 'completed' : 'marked incomplete'}`);
    } catch (error: any) {
      console.error('Error updating step:', error);
      toast.error('Failed to update step');
    } finally {
      setIsUpdating(null);
    }
  };

  const calculateProgress = () => {
    if (steps.length === 0) return 0;
    const completedSteps = steps.filter(step => step.is_completed).length;
    return Math.round((completedSteps / steps.length) * 100);
  };

  const getStepIcon = (step: OnboardingStep) => {
    if (isUpdating === step.id) {
      return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    }
    
    if (step.is_completed) {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
    
    return <Circle className="h-5 w-5 text-gray-400" />;
  };

  const getStepStatus = (step: OnboardingStep) => {
    if (step.is_completed) {
      return (
        <Badge variant="default" className="bg-green-500 text-white">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    );
  };

  const progress = calculateProgress();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading onboarding steps...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5" />
            Onboarding Progress - {tenantName}
          </CardTitle>
          <Badge variant={progress === 100 ? "default" : "secondary"}>
            {progress}% Complete
          </Badge>
        </div>
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <div className="text-sm text-muted-foreground">
            {steps.filter(s => s.is_completed).length} of {steps.length} steps completed
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500 min-w-[2rem]">
                    {step.step_order}
                  </span>
                  {getStepIcon(step)}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{step.step_name}</h4>
                  {step.completed_at && (
                    <div className="text-xs text-gray-500 mt-1">
                      Completed on {new Date(step.completed_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {getStepStatus(step)}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleStepCompletion(step.id, step.is_completed)}
                  disabled={isUpdating === step.id}
                  className="min-w-[100px]"
                >
                  {isUpdating === step.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : step.is_completed ? (
                    'Mark Incomplete'
                  ) : (
                    'Mark Complete'
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {steps.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>No onboarding steps found for this tenant.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
