
import React, { useState, useMemo, useCallback } from 'react';
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
import { useSimpleTenantData } from '@/hooks/useSimpleTenantData';
import { useOnboardingWorkflow } from '@/hooks/useOnboardingWorkflow';
import { OnboardingErrorBoundary } from './OnboardingErrorBoundary';

interface SimpleTenantOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  workflowId?: string;
}

const STEP_COMPONENTS: Record<string, React.ComponentType<any>> = {
  'Company Profile': CompanyProfileStep,
  'Branding & Design': EnhancedBrandingStep,
  'Enhanced Branding': EnhancedBrandingStep,
  'Team & Permissions': EnhancedUsersRolesStep,
  'Enhanced Users & Roles': EnhancedUsersRolesStep,
  'Billing & Plan': BillingPlanStep,
  'Domain & White-label': DomainWhitelabelStep,
  'Domain & Branding': DomainWhitelabelStep,
  'Review & Launch': ReviewGoLiveStep,
  'Review & Go Live': ReviewGoLiveStep
};

const normalizeStepName = (stepName: string): string => {
  return stepName.toLowerCase().replace(/\s+/g, '-');
};

const safeGetProperty = (obj: any, path: string, defaultValue: any = undefined) => {
  try {
    if (!obj || typeof obj !== 'object') return defaultValue;
    
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }
    
    return current ?? defaultValue;
  } catch (error) {
    console.warn(`Error accessing property ${path}:`, error);
    return defaultValue;
  }
};

export const SimpleTenantOnboardingWizard: React.FC<SimpleTenantOnboardingWizardProps> = ({
  isOpen,
  onClose,
  tenantId,
  workflowId: initialWorkflowId
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepData, setStepData] = useState<Record<string, any>>({});

  // Simplified data fetching
  const {
    data: tenantInfo,
    isLoading: tenantLoading,
    error: tenantError
  } = useSimpleTenantData({
    tenantId,
    enabled: isOpen && !!tenantId
  });

  const {
    workflow,
    steps,
    isLoading: workflowLoading,
    error: workflowError,
    updateStepStatus,
    retryInitialization
  } = useOnboardingWorkflow({
    tenantId,
    workflowId: initialWorkflowId,
    autoCreate: true
  });

  const getStepComponent = useCallback((stepName: string) => {
    return STEP_COMPONENTS[stepName] || CompanyProfileStep;
  }, []);

  const transformedSteps = useMemo(() => {
    return steps.map((dbStep) => {
      const stepData = dbStep.step_data || {};
      
      return {
        id: normalizeStepName(dbStep.step_name),
        title: dbStep.step_name,
        description: safeGetProperty(stepData, 'help_text', `Step ${dbStep.step_number} of the onboarding process`),
        status: dbStep.step_status,
        component: getStepComponent(dbStep.step_name),
        isRequired: safeGetProperty(stepData, 'is_required', true),
        estimatedTime: safeGetProperty(stepData, 'estimated_time', 15),
        helpText: safeGetProperty(stepData, 'help_text'),
        dbStepNumber: dbStep.step_number
      };
    });
  }, [steps, getStepComponent]);

  const currentProgress = useMemo(() => {
    if (transformedSteps.length === 0) return 0;
    const completedSteps = transformedSteps.filter(s => s.status === 'completed').length;
    return Math.round((completedSteps / transformedSteps.length) * 100);
  }, [transformedSteps]);

  const totalEstimatedTime = useMemo(() => {
    return transformedSteps.reduce((total, step) => total + step.estimatedTime, 0);
  }, [transformedSteps]);

  const remainingTime = useMemo(() => {
    const remainingSteps = transformedSteps.slice(currentStepIndex).filter(s => s.status !== 'completed');
    return remainingSteps.reduce((total, step) => total + step.estimatedTime, 0);
  }, [transformedSteps, currentStepIndex]);

  const handleStepComplete = useCallback(async (data: any) => {
    const currentStep = transformedSteps[currentStepIndex];
    if (!currentStep) return;

    try {
      await updateStepStatus(currentStep.dbStepNumber, 'completed', data);
      
      setTimeout(() => {
        if (currentStepIndex < transformedSteps.length - 1) {
          setCurrentStepIndex(currentStepIndex + 1);
        }
      }, 1000);
    } catch (error) {
      console.error('Failed to complete step:', error);
    }
  }, [currentStepIndex, transformedSteps, updateStepStatus]);

  const handleNextStep = useCallback(() => {
    if (currentStepIndex < transformedSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  }, [currentStepIndex, transformedSteps.length]);

  const handlePreviousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  }, [currentStepIndex]);

  const handleStepClick = useCallback((index: number) => {
    const step = transformedSteps[index];
    if (step && (step.status === 'completed' || Math.abs(index - currentStepIndex) <= 1)) {
      setCurrentStepIndex(index);
    }
  }, [transformedSteps, currentStepIndex]);

  const getStatusIcon = useCallback((status: string) => {
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
  }, []);

  const isLoading = workflowLoading || tenantLoading;
  const hasError = workflowError || tenantError;
  const CurrentStepComponent = transformedSteps[currentStepIndex]?.component;

  // Show loading state
  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Loading Onboarding Wizard</DialogTitle>
            <DialogDescription>
              {tenantLoading ? 'Loading tenant information...' : 'Setting up your onboarding workflow...'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground">
                {tenantLoading ? 'Fetching tenant data...' : 'Initializing workflow...'}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show error state
  if (hasError) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Error Loading Onboarding</DialogTitle>
            <DialogDescription>
              There was an error loading the onboarding wizard.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
              <div>
                <h3 className="font-medium text-lg">Failed to Load</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {workflowError || tenantError?.message || 'Unknown error occurred'}
                </p>
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

  // Show empty state if no steps
  if (transformedSteps.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>No Onboarding Steps</DialogTitle>
            <DialogDescription>
              No onboarding steps were found for this tenant.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <Button onClick={retryInitialization}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload Steps
            </Button>
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
                  Tenant Onboarding
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  {tenantInfo?.name || 'Loading...'} • {tenantInfo?.subscription_plan || 'Basic'} Plan
                </DialogDescription>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{currentProgress}% Complete</div>
                <div className="text-xs text-muted-foreground">
                  ~{remainingTime} minutes remaining
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Progress value={currentProgress} className="w-full h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Step {currentStepIndex + 1} of {transformedSteps.length}</span>
                <span>Total time: ~{totalEstimatedTime} minutes</span>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-1 gap-6 overflow-hidden">
            {/* Steps Sidebar */}
            <div className="w-80 space-y-2 overflow-y-auto pr-2">
              <div className="sticky top-0 bg-background py-2 mb-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Onboarding Steps
                </h3>
              </div>
              {transformedSteps.map((step, index) => (
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
                  {index < transformedSteps.length - 1 && (
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
                  {CurrentStepComponent && transformedSteps[currentStepIndex] && (
                    <CurrentStepComponent
                      tenantId={tenantId}
                      onComplete={handleStepComplete}
                      data={stepData[transformedSteps[currentStepIndex].id] || {}}
                      onDataChange={(data: any) => {
                        setStepData(prev => ({
                          ...prev,
                          [transformedSteps[currentStepIndex].id]: data
                        }));
                      }}
                      helpText={transformedSteps[currentStepIndex].helpText}
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
                        {transformedSteps[currentStepIndex]?.title || 'Loading...'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Step {currentStepIndex + 1} of {transformedSteps.length}
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleNextStep}
                    disabled={currentStepIndex === transformedSteps.length - 1}
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
