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

interface ConsolidatedTenantOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  workflowId?: string;
}

// Comprehensive step components mapping with normalized keys
const STEP_COMPONENTS: Record<string, React.ComponentType<any>> = {
  // Company Profile / Business Verification variations
  'company-profile': CompanyProfileStep,
  'company_profile': CompanyProfileStep,
  'business-verification': CompanyProfileStep,
  'business_verification': CompanyProfileStep,
  'business-profile': CompanyProfileStep,
  'business_profile': CompanyProfileStep,
  
  // Branding variations
  'branding': EnhancedBrandingStep,
  'branding-design': EnhancedBrandingStep,
  'branding_design': EnhancedBrandingStep,
  'enhanced-branding': EnhancedBrandingStep,
  'enhanced_branding': EnhancedBrandingStep,
  'customization': EnhancedBrandingStep,
  'app-branding': EnhancedBrandingStep,
  'app_branding': EnhancedBrandingStep,
  
  // Users and Roles variations
  'users-roles': EnhancedUsersRolesStep,
  'users_roles': EnhancedUsersRolesStep,
  'team-setup': EnhancedUsersRolesStep,
  'team_setup': EnhancedUsersRolesStep,
  'team-permissions': EnhancedUsersRolesStep,
  'team_permissions': EnhancedUsersRolesStep,
  'user-management': EnhancedUsersRolesStep,
  'user_management': EnhancedUsersRolesStep,
  'enhanced-users-roles': EnhancedUsersRolesStep,
  'enhanced_users_roles': EnhancedUsersRolesStep,
  
  // Billing variations
  'billing': BillingPlanStep,
  'billing-plan': BillingPlanStep,
  'billing_plan': BillingPlanStep,
  'subscription': BillingPlanStep,
  'subscription-plan': BillingPlanStep,
  'subscription_plan': BillingPlanStep,
  'plan-selection': BillingPlanStep,
  'plan_selection': BillingPlanStep,
  
  // Domain and White-label variations
  'domain': DomainWhitelabelStep,
  'domain-setup': DomainWhitelabelStep,
  'domain_setup': DomainWhitelabelStep,
  'domain-whitelabel': DomainWhitelabelStep,
  'domain_whitelabel': DomainWhitelabelStep,
  'domain-configuration': DomainWhitelabelStep,
  'domain_configuration': DomainWhitelabelStep,
  'whitelabel': DomainWhitelabelStep,
  'white-label': DomainWhitelabelStep,
  'white_label': DomainWhitelabelStep,
  
  // Review and Go Live variations
  'review': ReviewGoLiveStep,
  'review-launch': ReviewGoLiveStep,
  'review_launch': ReviewGoLiveStep,
  'review-go-live': ReviewGoLiveStep,
  'review_go_live': ReviewGoLiveStep,
  'go-live': ReviewGoLiveStep,
  'go_live': ReviewGoLiveStep,
  'launch': ReviewGoLiveStep,
  'final-review': ReviewGoLiveStep,
  'final_review': ReviewGoLiveStep
};

const normalizeStepName = (stepName: string): string => {
  if (!stepName) return '';
  
  return stepName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
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

export const ConsolidatedTenantOnboardingWizard: React.FC<ConsolidatedTenantOnboardingWizardProps> = ({
  isOpen,
  onClose,
  tenantId,
  workflowId: initialWorkflowId
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepData, setStepData] = useState<Record<string, any>>({});

  // Single source of truth for tenant data
  const {
    data: tenantInfo,
    isLoading: tenantLoading,
    error: tenantError
  } = useSimpleTenantData({
    tenantId,
    enabled: isOpen && !!tenantId
  });

  // Single source of truth for workflow data
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
    console.log('🔍 Resolving component for step:', stepName);
    
    if (!stepName) {
      console.warn('⚠️ Empty step name provided');
      return CompanyProfileStep;
    }

    // Try exact match first
    let component = STEP_COMPONENTS[stepName];
    if (component) {
      console.log('✅ Found exact match:', stepName, '→', component.name);
      return component;
    }

    // Try normalized version
    const normalized = normalizeStepName(stepName);
    console.log('🔄 Trying normalized version:', stepName, '→', normalized);
    
    component = STEP_COMPONENTS[normalized];
    if (component) {
      console.log('✅ Found normalized match:', normalized, '→', component.name);
      return component;
    }

    // Try with underscores
    const underscored = normalized.replace(/-/g, '_');
    component = STEP_COMPONENTS[underscored];
    if (component) {
      console.log('✅ Found underscored match:', underscored, '→', component.name);
      return component;
    }

    // Try partial matches for common patterns
    const stepLower = stepName.toLowerCase();
    
    if (stepLower.includes('company') || stepLower.includes('profile') || stepLower.includes('business')) {
      console.log('🔧 Matched to CompanyProfileStep via pattern matching');
      return CompanyProfileStep;
    }
    
    if (stepLower.includes('brand') || stepLower.includes('design') || stepLower.includes('custom')) {
      console.log('🔧 Matched to EnhancedBrandingStep via pattern matching');
      return EnhancedBrandingStep;
    }
    
    if (stepLower.includes('user') || stepLower.includes('role') || stepLower.includes('team') || stepLower.includes('permission')) {
      console.log('🔧 Matched to EnhancedUsersRolesStep via pattern matching');
      return EnhancedUsersRolesStep;
    }
    
    if (stepLower.includes('billing') || stepLower.includes('plan') || stepLower.includes('subscription')) {
      console.log('🔧 Matched to BillingPlanStep via pattern matching');
      return BillingPlanStep;
    }
    
    if (stepLower.includes('domain') || stepLower.includes('white') || stepLower.includes('label')) {
      console.log('🔧 Matched to DomainWhitelabelStep via pattern matching');
      return DomainWhitelabelStep;
    }
    
    if (stepLower.includes('review') || stepLower.includes('launch') || stepLower.includes('live') || stepLower.includes('final')) {
      console.log('🔧 Matched to ReviewGoLiveStep via pattern matching');
      return ReviewGoLiveStep;
    }

    console.warn('❌ No component found for step:', stepName, '- Using fallback CompanyProfileStep');
    console.log('📋 Available component keys:', Object.keys(STEP_COMPONENTS).slice(0, 10), '...');
    
    return CompanyProfileStep;
  }, []);

  const transformedSteps = useMemo(() => {
    console.log('🔄 Transforming steps:', steps?.length || 0, 'steps found');
    
    if (!steps || steps.length === 0) {
      console.log('⚠️ No steps available for transformation');
      return [];
    }
    
    return steps.map((dbStep, index) => {
      const stepData = dbStep.step_data || {};
      const component = getStepComponent(dbStep.step_name);
      
      console.log(`📋 Step ${index + 1}: "${dbStep.step_name}" (${dbStep.step_status}) → ${component?.name || 'undefined'}`);
      
      return {
        id: normalizeStepName(dbStep.step_name) || `step-${index}`,
        title: dbStep.step_name || `Step ${dbStep.step_number}`,
        description: safeGetProperty(stepData, 'help_text', `Step ${dbStep.step_number} of the onboarding process`),
        status: dbStep.step_status || 'pending',
        component,
        isRequired: safeGetProperty(stepData, 'is_required', true),
        estimatedTime: safeGetProperty(stepData, 'estimated_time', 15),
        helpText: safeGetProperty(stepData, 'help_text'),
        dbStepNumber: dbStep.step_number
      };
    });
  }, [steps, getStepComponent]);

  // Enhanced progress calculation with better accuracy
  const currentProgress = useMemo(() => {
    if (!transformedSteps || transformedSteps.length === 0) {
      console.log('📊 Progress: 0% (no steps)');
      return 0;
    }
    
    const completedCount = transformedSteps.filter(s => s.status === 'completed').length;
    const inProgressCount = transformedSteps.filter(s => s.status === 'in_progress').length;
    const skippedCount = transformedSteps.filter(s => s.status === 'skipped').length;
    
    // Give full credit for completed and skipped, partial credit for in-progress
    const totalProgress = completedCount + skippedCount + (inProgressCount * 0.5);
    const percentage = Math.round((totalProgress / transformedSteps.length) * 100);
    
    console.log('📊 Progress calculation:', {
      total: transformedSteps.length,
      completed: completedCount,
      inProgress: inProgressCount,
      skipped: skippedCount,
      percentage
    });
    
    return Math.min(100, Math.max(0, percentage));
  }, [transformedSteps]);

  const totalEstimatedTime = useMemo(() => {
    return transformedSteps.reduce((total, step) => total + step.estimatedTime, 0);
  }, [transformedSteps]);

  const remainingTime = useMemo(() => {
    const remainingSteps = transformedSteps.slice(currentStepIndex).filter(s => s.status !== 'completed' && s.status !== 'skipped');
    return remainingSteps.reduce((total, step) => total + step.estimatedTime, 0);
  }, [transformedSteps, currentStepIndex]);

  const handleStepComplete = useCallback(async (data: any) => {
    const currentStep = transformedSteps[currentStepIndex];
    if (!currentStep) {
      console.error('❌ No current step found for completion');
      return;
    }

    console.log('✅ Completing step:', currentStep.title, 'with data:', data);

    try {
      await updateStepStatus(currentStep.dbStepNumber, 'completed', data);
      
      // Auto-advance to next step after a short delay
      setTimeout(() => {
        if (currentStepIndex < transformedSteps.length - 1) {
          const nextIndex = currentStepIndex + 1;
          console.log('➡️ Auto-advancing to step:', nextIndex + 1);
          setCurrentStepIndex(nextIndex);
        }
      }, 1000);
    } catch (error) {
      console.error('❌ Failed to complete step:', error);
    }
  }, [currentStepIndex, transformedSteps, updateStepStatus]);

  const handleNextStep = useCallback(() => {
    if (currentStepIndex < transformedSteps.length - 1) {
      const newIndex = currentStepIndex + 1;
      console.log('➡️ Moving to next step:', newIndex + 1);
      setCurrentStepIndex(newIndex);
    } else {
      console.log('🏁 Already at last step');
    }
  }, [currentStepIndex, transformedSteps.length]);

  const handlePreviousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      const newIndex = currentStepIndex - 1;
      console.log('⬅️ Moving to previous step:', newIndex + 1);
      setCurrentStepIndex(newIndex);
    } else {
      console.log('🏁 Already at first step');
    }
  }, [currentStepIndex]);

  const handleStepClick = useCallback((index: number) => {
    const step = transformedSteps[index];
    if (!step) {
      console.warn('⚠️ Invalid step index clicked:', index);
      return;
    }

    // Allow navigation to completed steps or adjacent steps
    const canNavigate = step.status === 'completed' || 
                       step.status === 'skipped' || 
                       Math.abs(index - currentStepIndex) <= 1;
    
    if (canNavigate) {
      console.log('🔄 Navigating to step:', index + 1, step.title);
      setCurrentStepIndex(index);
    } else {
      console.log('🚫 Navigation blocked to step:', index + 1);
    }
  }, [transformedSteps, currentStepIndex]);

  const handleDataChange = useCallback((data: any) => {
    const currentStep = transformedSteps[currentStepIndex];
    if (currentStep) {
      console.log('📝 Data changed for step:', currentStep.title, data);
      setStepData(prev => ({
        ...prev,
        [currentStep.id]: data
      }));
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
      case 'skipped':
        return <CheckCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
    }
  }, []);

  const isLoading = workflowLoading || tenantLoading;
  const hasError = workflowError || tenantError;
  const currentStep = transformedSteps[currentStepIndex];
  const CurrentStepComponent = currentStep?.component;

  // Enhanced debugging for current step
  console.log('🎯 Current step details:', {
    index: currentStepIndex,
    step: currentStep,
    component: CurrentStepComponent?.name,
    stepName: currentStep?.title,
    totalSteps: transformedSteps.length
  });

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
                      : step.status === 'skipped'
                      ? 'border-gray-200 bg-gray-50/50 hover:bg-gray-100/50'
                      : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                  onClick={() => handleStepClick(index)}
                >
                  {index < transformedSteps.length - 1 && (
                    <div className={`absolute left-7 top-16 w-0.5 h-8 ${
                      step.status === 'completed' || step.status === 'skipped' ? 'bg-green-300' : 'bg-gray-200'
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
                          variant={step.status === 'completed' ? 'default' : step.status === 'skipped' ? 'secondary' : 'outline'} 
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
                  {CurrentStepComponent && currentStep ? (
                    <CurrentStepComponent
                      tenantId={tenantId}
                      onComplete={handleStepComplete}
                      data={stepData[currentStep.id] || {}}
                      onDataChange={handleDataChange}
                      helpText={currentStep.helpText}
                      tenantInfo={tenantInfo}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">Component Not Found</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        No component found for step: {currentStep?.title || 'Unknown'}
                      </p>
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <p>Step details:</p>
                        <p>Name: {currentStep?.title}</p>
                        <p>Component: {CurrentStepComponent?.name || 'undefined'}</p>
                      </div>
                      <Button variant="outline" onClick={() => setCurrentStepIndex(0)} className="mt-4">
                        Go to First Step
                      </Button>
                    </div>
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
                        {currentStep?.title || 'Loading...'}
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
