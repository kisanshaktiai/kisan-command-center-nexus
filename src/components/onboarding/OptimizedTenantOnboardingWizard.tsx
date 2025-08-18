import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { useOptimizedOnboardingWorkflow } from '@/hooks/useOptimizedOnboardingWorkflow';
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

interface OptimizedTenantOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  workflowId?: string;
}

// Fixed stable component mapping - moved outside to prevent recreation
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

// Helper function to safely extract properties from JSON data
const safeGetJsonProperty = (obj: any, key: string, defaultValue: any = undefined) => {
  if (!obj || typeof obj !== 'object') return defaultValue;
  return obj[key] ?? defaultValue;
};

export const OptimizedTenantOnboardingWizard: React.FC<OptimizedTenantOnboardingWizardProps> = ({
  isOpen,
  onClose,
  tenantId,
  workflowId: initialWorkflowId
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepData, setStepData] = useState<Record<string, any>>({});
  const [stepsState, setStepsState] = useState<OnboardingStep[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const { showSuccess, showError } = useNotifications();

  // Progress loading state to prevent duplicate calls
  const progressLoadStateRef = useRef<{
    loaded: boolean;
    workflowId: string | null;
    loading: boolean;
  }>({
    loaded: false,
    workflowId: null,
    loading: false
  });

  // Use optimized hooks with proper caching
  const {
    workflow,
    isLoading: workflowLoading,
    error: workflowError,
    retryInitialization
  } = useOptimizedOnboardingWorkflow({
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

  // Fixed stable component getter - memoized to prevent recreation
  const getStepComponent = useCallback((stepName: string) => {
    return STEP_COMPONENT_MAP[stepName] || CompanyProfileStep;
  }, []);

  // Optimized progress loading with proper guards
  const loadOnboardingProgress = useCallback(async () => {
    if (!workflow?.id) {
      console.log('No workflow ID available for loading progress');
      return;
    }

    const currentState = progressLoadStateRef.current;

    // Prevent multiple simultaneous loading attempts
    if (currentState.loading) {
      console.log('Progress loading already in progress, skipping...');
      return;
    }

    // Check if we've already loaded for this workflow
    if (currentState.loaded && currentState.workflowId === workflow.id) {
      console.log('Progress already loaded for this workflow, skipping...');
      return;
    }

    try {
      // Update state atomically
      progressLoadStateRef.current = {
        loaded: false,
        workflowId: workflow.id,
        loading: true
      };

      setProgressLoading(true);
      console.log('Loading onboarding progress for workflow:', workflow.id);

      const { data, error } = await supabase
        .from('onboarding_steps')
        .select('*')
        .eq('workflow_id', workflow.id)
        .order('step_number');

      if (error) {
        console.error('Error loading onboarding steps:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.error('No steps found for workflow');
        showError('No onboarding steps found. Please try refreshing.');
        setStepsState([]);
        return;
      }

      const updatedSteps = data.map((dbStep) => {
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
      
      setStepsState(updatedSteps);

      // Set current step to first incomplete step
      const firstIncomplete = updatedSteps.findIndex(s => s.status === 'pending' || s.status === 'in_progress');
      if (firstIncomplete !== -1) {
        setCurrentStepIndex(firstIncomplete);
      }

      // Mark as loaded for this workflow
      progressLoadStateRef.current = {
        loaded: true,
        workflowId: workflow.id,
        loading: false
      };

    } catch (error) {
      console.error('Error loading onboarding progress:', error);
      showError('Failed to load onboarding progress');
      setStepsState([]);
      
      progressLoadStateRef.current = {
        loaded: false,
        workflowId: null,
        loading: false
      };
    } finally {
      setProgressLoading(false);
    }
  }, [workflow?.id, getStepComponent, showError]);

  // Load progress when workflow is available - with proper dependency management
  useEffect(() => {
    const currentState = progressLoadStateRef.current;
    
    if (workflow?.id && 
        (!currentState.loaded || currentState.workflowId !== workflow.id) &&
        !currentState.loading) {
      
      console.log('Triggering progress load for workflow:', workflow.id);
      loadOnboardingProgress();
    }
  }, [workflow?.id, loadOnboardingProgress]);

  // Reset state when dialog closes or workflow changes
  useEffect(() => {
    if (!isOpen) {
      progressLoadStateRef.current = {
        loaded: false,
        workflowId: null,
        loading: false
      };
      setStepsState([]);
      setCurrentStepIndex(0);
      setStepData({});
    }
  }, [isOpen]);

  // Reset progress state when workflow changes
  useEffect(() => {
    if (workflow?.id !== progressLoadStateRef.current.workflowId) {
      progressLoadStateRef.current = {
        loaded: false,
        workflowId: null,
        loading: false
      };
    }
  }, [workflow?.id]);

  // Memoized calculations
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

  const updateStepStatus = useCallback(async (stepIndex: number, status: OnboardingStep['status'], data: any = {}) => {
    if (!workflow?.id) return;

    try {
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
        p_step_id: targetStep.id,
        p_new_status: status,
        p_step_data: data
      });

      if (error) throw error;

      const updatedSteps = [...stepsState];
      updatedSteps[stepIndex] = { ...updatedSteps[stepIndex], status };
      setStepsState(updatedSteps);

      setStepData(prev => ({
        ...prev,
        [stepsState[stepIndex].id]: data
      }));

      showSuccess(`${stepsState[stepIndex].title} ${status === 'completed' ? 'completed' : 'updated'}`);
    } catch (error) {
      console.error('Error updating step status:', error);
      showError('Failed to update step status');
    }
  }, [workflow?.id, stepsState, showSuccess, showError]);

  const handleStepComplete = useCallback((data: any) => {
    updateStepStatus(currentStepIndex, 'completed', data);
    
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

  const isLoading = workflowLoading || tenantLoading || progressLoading;
  const hasError = workflowError || tenantError;
  const CurrentStepComponent = stepsState[currentStepIndex]?.component;

  // Show loading state
  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Initializing Onboarding Workflow</DialogTitle>
            <DialogDescription>
              Setting up your tenant onboarding workflow. Please wait...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground">
                {tenantLoading ? 'Loading tenant information...' : 
                 workflowLoading ? 'Initializing workflow...' :
                 'Loading onboarding progress...'}
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
                  {tenantInfo?.name || 'Loading...'} • {tenantInfo?.subscription_plan || 'Loading...'} Plan
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
                <span>Step {currentStepIndex + 1} of {stepsState.length}</span>
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
                  {CurrentStepComponent && stepsState[currentStepIndex] && (
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
                        {stepsState[currentStepIndex]?.title || 'Loading...'}
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
