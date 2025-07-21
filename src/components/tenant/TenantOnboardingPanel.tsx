
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Clock, PlayCircle, AlertCircle, Loader2 } from 'lucide-react';
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

  // Mock data since we can't access the new table yet
  const mockSteps: OnboardingStep[] = [
    {
      id: '1',
      tenant_id: tenantId,
      step_name: 'Account Setup',
      step_order: 1,
      is_completed: true,
      completed_at: new Date().toISOString(),
      completed_by: 'admin',
      step_data: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      tenant_id: tenantId,
      step_name: 'Profile Configuration',
      step_order: 2,
      is_completed: true,
      completed_at: new Date().toISOString(),
      completed_by: 'admin',
      step_data: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '3',
      tenant_id: tenantId,
      step_name: 'Payment Setup',
      step_order: 3,
      is_completed: false,
      completed_at: null,
      completed_by: null,
      step_data: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '4',
      tenant_id: tenantId,
      step_name: 'Feature Configuration',
      step_order: 4,
      is_completed: false,
      completed_at: null,
      completed_by: null,
      step_data: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const toggleStepCompletion = async (stepId: string, currentStatus: boolean) => {
    setIsUpdating(stepId);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success(`Step ${!currentStatus ? 'completed' : 'marked incomplete'}`);
    } catch (error: any) {
      console.error('Error updating step:', error);
      toast.error('Failed to update step');
    } finally {
      setIsUpdating(null);
    }
  };

  const calculateProgress = () => {
    if (mockSteps.length === 0) return 0;
    const completedSteps = mockSteps.filter(step => step.is_completed).length;
    return Math.round((completedSteps / mockSteps.length) * 100);
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
            {mockSteps.filter(s => s.is_completed).length} of {mockSteps.length} steps completed
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockSteps.map((step, index) => (
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

        {mockSteps.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>No onboarding steps found for this tenant.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
