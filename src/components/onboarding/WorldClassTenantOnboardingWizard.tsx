
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { useTenantOnboardingWorkflow } from '@/hooks/useTenantOnboardingWorkflow';
import { useTenantData } from '@/hooks/useTenantData';
import { OnboardingErrorBoundary } from './OnboardingErrorBoundary';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  component: React.ComponentType<any>;
  isRequired: boolean;
  estimatedTime: number;
  helpText?: string;
}

interface WorldClassTenantOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  workflowId?: string;
}

// Stable component mapping for consistent rendering
const STEP_COMPONENT_MAP: Record<string, React.ComponentType<any>> = {
  'Company Profile': CompanyProfileStep,
  'Branding & Design': EnhancedBrandingStep,
  'Team & Permissions': EnhancedUsersRolesStep,
  'Users & Roles': EnhancedUsersRolesStep,
  'Team Setup': EnhancedUsersRolesStep,
  'User Management': EnhancedUsersRolesStep,
  'Billing & Plan': BillingPlanStep,
  'Domain & White-label': DomainWhitelabelStep,
  'Domain & Branding': DomainWhitelabelStep,
  'Review & Launch': ReviewGoLiveStep
};

const safeGetJsonProperty = (obj: any, key: string, defaultValue: any = undefined) => {
  if (!obj || typeof obj !== 'object') return defaultValue;
  return obj[key] ?? defaultValue;
};

export const WorldClassTenantOnboardingWizard: React.FC<WorldClassTenantOnboardingWizardProps> = ({
  isOpen,
  onClose,
  tenantId,
  workflowId: initialWorkflowId
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepData, setStepData] = useState<Record<string, any>>({});
  const [stepsState, setStepsState] = useState<OnboardingStep[]>([]);

  // Use consolidated hooks
  const {
    workflow,
    steps,
    isLoading: workflowLoading,
    error: workflowError,
    updateStepStatus,
    retryInitialization
  } = useTenantOnboardingWorkflow({
    tenantId,
    workflowId: initialWorkflowId,
    autoCreate: true
  });

  const {
    data: tenantInfo,
    isLoading: tenantLoading,
    error: tenantError
  } = useTenantData({
    tenantId,
    enabled: isOpen && !!tenantId
  });

  const getStepComponent = useCallback((stepName: string) => {
    return STEP_COMPONENT_MAP[stepName] || CompanyProfileStep;
  }, []);

  // Transform database steps into UI steps
  useEffect(() => {
    if (steps.length > 0) {
      const transformedSteps = steps.map((dbStep) => {
        const stepData = dbStep.step_data || {};
        
        return {
          id: dbStep.step_name.toLowerCase().replace(/\s+/g, '_'),
          title: dbStep.step_name,
          description: safeGetJsonProperty(stepData, 'help_text', `Step ${dbStep.step_number} of the onboarding process`),
          status: (dbStep.step_status as OnboardingStep['status']) || 'pending',
          component: getStepComponent(dbStep.step_name),
          isRequired: safeGetJsonProperty(stepData, 'is_required', true),
          estimatedTime: safeGetJsonProperty(stepData, 'estimated_time', 15),
          helpText: safeGetJsonProperty(stepData, 'help_text')
        };
      });
      
      setStepsState(transformedSteps);

      // Set current step to first incomplete step
      const firstIncomplete = transformedSteps.findIndex(s => s.status === 'pending' || s.status === 'in_progress');
      if (firstIncomplete !== -1) {
        setCurrentStepIndex(firstIncomplete);
      }
    }
  }, [steps, getStepComponent]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setStepsState([]);
      setCurrentStepIndex(0);
      setStepData({});
    }
  }, [isOpen]);

  // Memoized calculations for performance
  const currentProgress = useMemo(() => {
    if (stepsState.length === 0) return 0;
    const completedSteps = stepsState.filter(s => s.status === 'completed').length;
    return Math.round((completedSteps / stepsState.length) * 100);
  }, [stepsState]);

  const totalEstimatedTime = useMemo(() => {
    return stepsState.reduce((total, step) => total + step.estimatedTime, 0);
  }, [stepsState]);

  const remainingTime = useMemo(() => {
    const remainingSteps = stepsState.slice(currentStepIndex).filter(s => s.status !== 'completed');
    return remainingSteps.reduce((total, step) => total + step.estimatedTime, 0);
  }, [stepsState, currentStepIndex]);

  const handleStepComplete = useCallback((data: any) => {
    updateStepStatus(currentStepIndex + 1, 'completed', data);
    
    setTimeout(() => {
      if (currentStepIndex < stepsState.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
      }
    }, 1000);
  }, [currentStepIndex, stepsState.length, updateStepStatus]);

  const handleNextStep = useCallback(() => {
    if (currentStepIndex < stepsState.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  }, [currentStepIndex, stepsState.length]);

  const handlePreviousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  }, [currentStepIndex]);

  const handleStepClick = useCallback((index: number) => {
    const step = stepsState[index];
    if (step.status === 'completed' || Math.abs(index - currentStepIndex) <= 1) {
      setCurrentStepIndex(index);
    }
  }, [stepsState, currentStepIndex]);

  const getStatusIcon = useCallback((status: OnboardingStep['status']) => {
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
  const CurrentStepComponent = stepsState[currentStepIndex]?.component;

  // Loading state with elegant design
  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              Initializing Onboarding Workflow
            </DialogTitle>
            <DialogDescription>
              Setting up your world-class tenant onboarding experience...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-16">
            <div className="text-center space-y-6">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  {tenantLoading ? 'Loading tenant information...' : 
                   workflowLoading ? 'Initializing workflow...' :
                   'Preparing onboarding steps...'}
                </p>
                <p className="text-sm text-muted-foreground">This will only take a moment</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Error state with recovery options
  if (hasError) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-6 h-6" />
              Workflow Initialization Failed
            </DialogTitle>
            <DialogDescription>
              We encountered an issue setting up your onboarding workflow. Please try again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-16">
            <div className="text-center space-y-6 max-w-md">
              <AlertCircle className="w-16 h-16 text-destructive mx-auto opacity-50" />
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Unable to Initialize Workflow</h3>
                <p className="text-sm text-muted-foreground">
                  {workflowError || tenantError?.message || 'An unexpected error occurred'}
                </p>
                <Button onClick={retryInitialization} className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Main world-class wizard interface
  return (
    <OnboardingErrorBoundary>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl max-h-[95vh] flex flex-col">
          {/* Header with elegant progress display */}
          <DialogHeader className="border-b pb-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <DialogTitle className="flex items-center gap-3 text-2xl">
                  <div className="relative">
                    <Sparkles className="w-7 h-7 text-primary" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary/20 rounded-full animate-ping"></div>
                  </div>
                  World-Class Tenant Onboarding
                </DialogTitle>
                <DialogDescription className="text-base">
                  {tenantInfo?.name || 'Loading...'} • {tenantInfo?.subscription_plan || 'Loading...'} Plan
                </DialogDescription>
              </div>
              <div className="text-right space-y-1">
                <div className="text-2xl font-bold text-primary">{currentProgress}%</div>
                <div className="text-sm text-muted-foreground">
                  ~{remainingTime} min remaining
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <Progress value={currentProgress} className="w-full h-3 bg-muted" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Step {currentStepIndex + 1} of {stepsState.length}</span>
                <span className="text-muted-foreground">Total: ~{totalEstimatedTime} minutes</span>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-1 gap-8 overflow-hidden">
            {/* Enhanced Steps Sidebar */}
            <div className="w-96 space-y-3 overflow-y-auto pr-4 bg-muted/30 rounded-lg p-4">
              <div className="sticky top-0 bg-muted/30 py-3 mb-4">
                <h3 className="font-semibold text-base text-muted-foreground uppercase tracking-wide">
                  Onboarding Journey
                </h3>
              </div>
              
              {stepsState.map((step, index) => (
                <div
                  key={step.id}
                  className={`group relative p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer hover:shadow-lg ${
                    index === currentStepIndex
                      ? 'border-primary bg-primary/10 shadow-md scale-[1.02]'
                      : step.status === 'completed'
                      ? 'border-green-200 bg-green-50/70 hover:bg-green-100/70 hover:border-green-300'
                      : 'border-border bg-background hover:bg-muted/50 hover:border-muted-foreground/20'
                  }`}
                  onClick={() => handleStepClick(index)}
                >
                  {/* Connection line */}
                  {index < stepsState.length - 1 && (
                    <div className={`absolute left-8 top-20 w-0.5 h-6 transition-colors ${
                      step.status === 'completed' ? 'bg-green-400' : 'bg-border'
                    }`} />
                  )}
                  
                  <div className="flex items-start gap-4">
                    <div className="relative flex-shrink-0">
                      {getStatusIcon(step.status)}
                      {index === currentStepIndex && (
                        <div className="absolute -inset-2 rounded-full bg-primary/10 animate-pulse" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-base truncate">{step.title}</h4>
                          {step.isRequired && (
                            <Badge variant="secondary" className="text-xs px-2 py-0.5">Required</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Badge 
                          variant={step.status === 'completed' ? 'default' : 'outline'} 
                          className="text-xs capitalize px-3 py-1"
                        >
                          {step.status.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-medium">
                          ~{step.estimatedTime}min
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Enhanced Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-5xl mx-auto p-8">
                  {CurrentStepComponent && stepsState[currentStepIndex] && (
                    <div className="animate-in fade-in-50 duration-500">
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
                        helpText={stepsState[currentStepIndex].helpText}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Enhanced Navigation Footer */}
              <div className="border-t bg-background/95 backdrop-blur-sm">
                <div className="flex justify-between items-center p-8">
                  <Button
                    variant="outline"
                    onClick={handlePreviousStep}
                    disabled={currentStepIndex === 0}
                    className="flex items-center gap-2 px-6 py-3"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Previous Step
                  </Button>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="font-semibold text-lg">
                        {stepsState[currentStepIndex]?.title || 'Loading...'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Step {currentStepIndex + 1} of {stepsState.length}
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleNextStep}
                    disabled={currentStepIndex === stepsState.length - 1}
                    className="flex items-center gap-2 px-6 py-3"
                  >
                    Next Step
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
