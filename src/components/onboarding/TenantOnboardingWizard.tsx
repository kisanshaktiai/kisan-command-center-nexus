import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, ArrowLeft, ArrowRight, Sparkles, RefreshCw } from 'lucide-react';
import { CompanyProfileStep } from './steps/CompanyProfileStep';
import { EnhancedBrandingStep } from './steps/EnhancedBrandingStep';
import { EnhancedUsersRolesStep } from './steps/EnhancedUsersRolesStep';
import { BillingPlanStep } from './steps/BillingPlanStep';
import { DomainWhitelabelStep } from './steps/DomainWhitelabelStep';
import { ReviewGoLiveStep } from './steps/ReviewGoLiveStep';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';
import { useOnboardingWorkflow } from '@/hooks/useOnboardingWorkflow';
import { OnboardingErrorBoundary } from './OnboardingErrorBoundary';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  component: React.ComponentType<any>;
  isRequired: boolean;
  estimatedTime: number;
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
  workflowId: initialWorkflowId
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepData, setStepData] = useState<Record<string, any>>({});
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [tenantLoading, setTenantLoading] = useState(false);
  const { showSuccess, showError } = useNotifications();

  // Use the workflow management hook
  const {
    workflow,
    isLoading: workflowLoading,
    error: workflowError,
    retryInitialization
  } = useOnboardingWorkflow({
    tenantId,
    workflowId: initialWorkflowId,
    autoCreate: true
  });

  const steps: OnboardingStep[] = [
    {
      id: 'company_profile',
      title: 'Company Profile',
      description: 'Business details and verification',
      status: 'pending',
      component: CompanyProfileStep,
      isRequired: true,
      estimatedTime: 15
    },
    {
      id: 'branding',
      title: 'Branding & Design',
      description: 'Customize your app appearance',
      status: 'pending',
      component: EnhancedBrandingStep,
      isRequired: false,
      estimatedTime: 10
    },
    {
      id: 'users_roles',
      title: 'Team & Permissions',
      description: 'Invite users and set up roles',
      status: 'pending',
      component: EnhancedUsersRolesStep,
      isRequired: true,
      estimatedTime: 20
    },
    {
      id: 'billing_plan',
      title: 'Billing & Plan',
      description: 'Configure subscription and billing',
      status: 'pending',
      component: BillingPlanStep,
      isRequired: true,
      estimatedTime: 10
    },
    {
      id: 'domain_whitelabel',
      title: 'Domain & Branding',
      description: 'Custom domain and white-label setup',
      status: 'pending',
      component: DomainWhitelabelStep,
      isRequired: false,
      estimatedTime: 15
    },
    {
      id: 'review_golive',
      title: 'Review & Launch',
      description: 'Final review and go live',
      status: 'pending',
      component: ReviewGoLiveStep,
      isRequired: true,
      estimatedTime: 5
    }
  ];

  const [stepsState, setStepsState] = useState<OnboardingStep[]>(steps);

  const loadTenantInfo = async () => {
    if (!tenantId) return;
    
    try {
      setTenantLoading(true);
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('name, subscription_plan, status, metadata')
        .eq('id', tenantId)
        .single();

      if (error) throw error;
      setTenantInfo(tenant);
    } catch (error) {
      console.error('Error loading tenant info:', error);
      showError('Failed to load tenant information');
    } finally {
      setTenantLoading(false);
    }
  };

  const loadOnboardingProgress = async () => {
    if (!workflow?.id) return;

    try {
      const { data, error } = await supabase
        .from('onboarding_steps')
        .select('*')
        .eq('workflow_id', workflow.id)
        .order('step_number');

      if (error) throw error;

      if (data && data.length > 0) {
        const updatedSteps = stepsState.map((step, index) => {
          const dbStep = data.find(s => s.step_number === index + 1);
          return {
            ...step,
            status: (dbStep?.step_status as OnboardingStep['status']) || 'pending'
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
    }
  };

  const updateStepStatus = async (stepIndex: number, status: OnboardingStep['status'], data: any = {}) => {
    if (!workflow?.id) return;

    try {
      // Get the actual step ID from the database
      const { data: dbSteps, error: stepsError } = await supabase
        .from('onboarding_steps')
        .select('id, step_number')
        .eq('workflow_id', workflow.id)
        .order('step_number');

      if (stepsError) throw stepsError;

      const targetStep = dbSteps?.find(s => s.step_number === stepIndex + 1);
      if (!targetStep) {
        throw new Error(`Step ${stepIndex + 1} not found in database`);
      }

      const { error } = await supabase.rpc('advance_onboarding_step', {
        p_step_id: targetStep.id, // Use the actual UUID from the database
        p_new_status: status,
        p_step_data: data
      });

      if (error) throw error;

      // Update local state
      const updatedSteps = [...stepsState];
      updatedSteps[stepIndex] = { ...updatedSteps[stepIndex], status };
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

  // Load tenant info when the dialog opens
  useEffect(() => {
    if (isOpen && tenantId) {
      loadTenantInfo();
    }
  }, [isOpen, tenantId]);

  // Load progress when workflow is available
  useEffect(() => {
    if (workflow?.id) {
      loadOnboardingProgress();
    }
  }, [workflow?.id]);

  const handleStepComplete = (data: any) => {
    updateStepStatus(currentStepIndex, 'completed', data);
    
    // Auto-advance to next step after a short delay
    setTimeout(() => {
      if (currentStepIndex < stepsState.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
      }
    }, 1000);
  };

  const handleNextStep = () => {
    if (currentStepIndex < stepsState.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleStepClick = (index: number) => {
    // Allow navigation to completed steps or adjacent steps
    const step = stepsState[index];
    if (step.status === 'completed' || Math.abs(index - currentStepIndex) <= 1) {
      setCurrentStepIndex(index);
    }
  };

  const getStatusIcon = (status: OnboardingStep['status']) => {
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

  const getTotalEstimatedTime = () => {
    return stepsState.reduce((total, step) => total + step.estimatedTime, 0);
  };

  const getRemainingTime = () => {
    const remainingSteps = stepsState.slice(currentStepIndex).filter(s => s.status !== 'completed');
    return remainingSteps.reduce((total, step) => total + step.estimatedTime, 0);
  };

  const CurrentStepComponent = stepsState[currentStepIndex]?.component;

  // Show loading state
  if (workflowLoading || tenantLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Initializing Onboarding</DialogTitle>
            <DialogDescription>
              Setting up your tenant onboarding workflow. Please wait...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground">
                {tenantLoading ? 'Loading tenant information...' : 'Initializing onboarding workflow...'}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show error state
  if (workflowError) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Workflow Initialization Failed</DialogTitle>
            <DialogDescription>
              There was an error setting up your onboarding workflow. Please try again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
              <div>
                <h3 className="font-medium text-lg">Failed to Initialize Workflow</h3>
                <p className="text-sm text-muted-foreground mt-2">{workflowError}</p>
              </div>
              <Button onClick={retryInitialization} className="mt-4">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show main wizard interface
  return (
    <OnboardingErrorBoundary>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl max-h-[95vh] flex flex-col">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Sparkles className="w-6 h-6 text-primary" />
                  Tenant Onboarding Wizard
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  {tenantInfo?.name} • {tenantInfo?.subscription_plan} Plan
                </DialogDescription>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{getCurrentProgress()}% Complete</div>
                <div className="text-xs text-muted-foreground">
                  ~{getRemainingTime()} minutes remaining
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Progress value={getCurrentProgress()} className="w-full h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Step {currentStepIndex + 1} of {stepsState.length}</span>
                <span>Total time: ~{getTotalEstimatedTime()} minutes</span>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-1 gap-6 overflow-hidden">
            {/* Enhanced Steps Sidebar */}
            <div className="w-80 space-y-2 overflow-y-auto pr-2">
              <div className="sticky top-0 bg-background py-2 mb-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Onboarding Steps
                </h3>
              </div>
              {stepsState.map((step, index) => (
                <div
                  key={step.id}
                  className={`group relative p-4 rounded-xl border transition-all cursor-pointer ${
                    index === currentStepIndex
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : step.status === 'completed'
                      ? 'border-green-200 bg-green-50/50 hover:bg-green-100/50'
                      : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                  onClick={() => handleStepClick(index)}
                >
                  {/* Step connector line */}
                  {index < stepsState.length - 1 && (
                    <div className={`absolute left-7 top-16 w-0.5 h-8 ${
                      step.status === 'completed' ? 'bg-green-300' : 'bg-gray-200'
                    }`} />
                  )}
                  
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      {getStatusIcon(step.status)}
                      {index === currentStepIndex && (
                        <div className="absolute -inset-1 rounded-full bg-primary/20 animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">{step.title}</h4>
                        {step.isRequired && (
                          <Badge variant="secondary" className="text-xs">Required</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {step.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <Badge 
                          variant={step.status === 'completed' ? 'default' : 'outline'} 
                          className="text-xs"
                        >
                          {step.status.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ~{step.estimatedTime}min
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto p-6">
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
              </div>

              {/* Navigation Footer */}
              <div className="border-t bg-background/80 backdrop-blur-sm">
                <div className="flex justify-between items-center p-6">
                  <Button
                    variant="outline"
                    onClick={handlePreviousStep}
                    disabled={currentStepIndex === 0}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Previous
                  </Button>

                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="font-medium text-sm">
                        {stepsState[currentStepIndex]?.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Step {currentStepIndex + 1} of {stepsState.length}
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleNextStep}
                    disabled={currentStepIndex === stepsState.length - 1}
                    className="flex items-center gap-2"
                  >
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </OnboardingErrorBoundary>
  );
};
