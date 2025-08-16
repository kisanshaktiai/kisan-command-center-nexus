
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { CompanyProfileStep } from './steps/CompanyProfileStep';
import { BrandingStep } from './steps/BrandingStep';
import { UsersRolesStep } from './steps/UsersRolesStep';
import { BillingPlanStep } from './steps/BillingPlanStep';
import { DomainWhitelabelStep } from './steps/DomainWhitelabelStep';
import { ReviewGoLiveStep } from './steps/ReviewGoLiveStep';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  component: React.ComponentType<any>;
  isRequired: boolean;
}

interface TenantOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  workflowId?: string;
}

export const TenantOnboardingWizard: React.FC<TenantOnboardingWizardProps> = ({
  isOpen,
  onClose,
  tenantId,
  workflowId
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepData, setStepData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError } = useNotifications();

  const steps: OnboardingStep[] = [
    {
      id: 'company_profile',
      title: 'Company Profile',
      description: 'Business details and verification',
      status: 'pending',
      component: CompanyProfileStep,
      isRequired: true
    },
    {
      id: 'branding',
      title: 'Branding & Customization',
      description: 'Logo, colors, and app customization',
      status: 'pending',
      component: BrandingStep,
      isRequired: false
    },
    {
      id: 'users_roles',
      title: 'Users & Roles',
      description: 'Team setup and permissions',
      status: 'pending',
      component: UsersRolesStep,
      isRequired: true
    },
    {
      id: 'billing_plan',
      title: 'Billing & Plan',
      description: 'Subscription and payment setup',
      status: 'pending',
      component: BillingPlanStep,
      isRequired: true
    },
    {
      id: 'domain_whitelabel',
      title: 'Domain & White-label',
      description: 'Custom domain and branding',
      status: 'pending',
      component: DomainWhitelabelStep,
      isRequired: false
    },
    {
      id: 'review_golive',
      title: 'Review & Go Live',
      description: 'Final review and activation',
      status: 'pending',
      component: ReviewGoLiveStep,
      isRequired: true
    }
  ];

  const [stepsState, setStepsState] = useState(steps);

  useEffect(() => {
    if (isOpen && workflowId) {
      loadOnboardingProgress();
    }
  }, [isOpen, workflowId]);

  const loadOnboardingProgress = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('onboarding_steps')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('step_number');

      if (error) throw error;

      if (data) {
        const updatedSteps = stepsState.map((step, index) => {
          const dbStep = data.find(s => s.step_number === index + 1);
          return {
            ...step,
            status: dbStep?.step_status || 'pending'
          };
        });
        setStepsState(updatedSteps);

        // Set current step to first incomplete step
        const firstIncomplete = updatedSteps.findIndex(s => s.status === 'pending' || s.status === 'in_progress');
        if (firstIncomplete !== -1) {
          setCurrentStepIndex(firstIncomplete);
        }
      }
    } catch (error) {
      console.error('Error loading onboarding progress:', error);
      showError('Failed to load onboarding progress');
    } finally {
      setIsLoading(false);
    }
  };

  const updateStepStatus = async (stepIndex: number, status: string, data: any = {}) => {
    try {
      if (!workflowId) return;

      const { error } = await supabase.rpc('advance_onboarding_step', {
        p_step_id: `${workflowId}-${stepIndex + 1}`,
        p_new_status: status,
        p_step_data: data
      });

      if (error) throw error;

      // Update local state
      const updatedSteps = [...stepsState];
      updatedSteps[stepIndex] = { ...updatedSteps[stepIndex], status: status as any };
      setStepsState(updatedSteps);

      // Update step data
      setStepData(prev => ({
        ...prev,
        [steps[stepIndex].id]: data
      }));

      showSuccess(`${steps[stepIndex].title} ${status === 'completed' ? 'completed' : 'updated'}`);
    } catch (error) {
      console.error('Error updating step status:', error);
      showError('Failed to update step status');
    }
  };

  const handleStepComplete = (data: any) => {
    updateStepStatus(currentStepIndex, 'completed', data);
    
    // Auto-advance to next step
    if (currentStepIndex < stepsState.length - 1) {
      setTimeout(() => {
        setCurrentStepIndex(currentStepIndex + 1);
      }, 1000);
    }
  };

  const handleNext = () => {
    if (currentStepIndex < stepsState.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleStepClick = (index: number) => {
    // Allow navigation to completed steps or current step
    const step = stepsState[index];
    if (step.status === 'completed' || index <= currentStepIndex) {
      setCurrentStepIndex(index);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const getCurrentProgress = () => {
    const completedSteps = stepsState.filter(s => s.status === 'completed').length;
    return Math.round((completedSteps / stepsState.length) * 100);
  };

  const CurrentStepComponent = stepsState[currentStepIndex]?.component;

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Tenant Onboarding Wizard</DialogTitle>
          <div className="space-y-4">
            <Progress value={getCurrentProgress()} className="w-full" />
            <div className="text-sm text-muted-foreground">
              Progress: {getCurrentProgress()}% complete
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 gap-6 overflow-hidden">
          {/* Steps Sidebar */}
          <div className="w-80 space-y-2 overflow-y-auto">
            {stepsState.map((step, index) => (
              <div
                key={step.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  index === currentStepIndex
                    ? 'border-primary bg-primary/5'
                    : step.status === 'completed'
                    ? 'border-green-200 bg-green-50 hover:bg-green-100'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => handleStepClick(index)}
              >
                <div className="flex items-start gap-3">
                  {getStatusIcon(step.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{step.title}</h4>
                      {step.isRequired && (
                        <Badge variant="secondary" className="text-xs">Required</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {step.description}
                    </p>
                    <Badge 
                      variant={step.status === 'completed' ? 'default' : 'outline'} 
                      className="text-xs mt-2"
                    >
                      {step.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              {CurrentStepComponent && (
                <CurrentStepComponent
                  tenantId={tenantId}
                  onComplete={handleStepComplete}
                  data={stepData[stepsState[currentStepIndex].id] || {}}
                  onDataChange={(data: any) => {
                    setStepData(prev => ({
                      ...prev,
                      [stepsState[currentStepIndex].id]: data
                    }));
                  }}
                />
              )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-4 border-t">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStepIndex === 0}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <div className="text-sm text-muted-foreground">
                Step {currentStepIndex + 1} of {stepsState.length}
              </div>

              <Button
                onClick={handleNext}
                disabled={currentStepIndex === stepsState.length - 1}
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
