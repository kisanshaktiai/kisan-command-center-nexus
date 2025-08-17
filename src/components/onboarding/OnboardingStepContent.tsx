
import React, { Suspense } from 'react';
import { useOnboarding } from './OnboardingProvider';
import { CompanyProfileStep } from './steps/CompanyProfileStep';
import { EnhancedBrandingStep } from './steps/EnhancedBrandingStep';
import { EnhancedUsersRolesStep } from './steps/EnhancedUsersRolesStep';
import { BillingPlanStep } from './steps/BillingPlanStep';
import { DomainWhitelabelStep } from './steps/DomainWhitelabelStep';
import { ReviewGoLiveStep } from './steps/ReviewGoLiveStep';
import { AlertCircle } from 'lucide-react';

// Step component mapping based on step names
const STEP_COMPONENTS = {
  'Company Profile': CompanyProfileStep,
  'Business Verification': CompanyProfileStep,
  'Enhanced Branding': EnhancedBrandingStep,
  'Branding & Design': EnhancedBrandingStep,
  'Advanced Branding': EnhancedBrandingStep,
  'Branding Configuration': EnhancedBrandingStep,
  'Simple Branding': EnhancedBrandingStep,
  'Enhanced Users & Roles': EnhancedUsersRolesStep,
  'Team & Permissions': EnhancedUsersRolesStep,
  'Team Setup': EnhancedUsersRolesStep,
  'Team Invites': EnhancedUsersRolesStep,
  'User Management': EnhancedUsersRolesStep,
  'Admin Setup': EnhancedUsersRolesStep,
  'Billing & Plan': BillingPlanStep,
  'Subscription Setup': BillingPlanStep,
  'Subscription Plan': BillingPlanStep,
  'Basic Setup': BillingPlanStep,
  'Domain & White-label': DomainWhitelabelStep,
  'Domain & Branding': DomainWhitelabelStep,
  'Review & Launch': ReviewGoLiveStep,
  'Review & Go Live': ReviewGoLiveStep,
  'Go-Live Testing': ReviewGoLiveStep
} as const;

const StepContentSkeleton = () => (
  <div className="max-w-4xl mx-auto p-8 space-y-6">
    <div className="space-y-4">
      <div className="h-8 bg-muted rounded animate-pulse" />
      <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
    </div>
    <div className="grid gap-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="space-y-3">
          <div className="h-4 bg-muted rounded animate-pulse w-1/4" />
          <div className="h-10 bg-muted rounded animate-pulse" />
        </div>
      ))}
    </div>
  </div>
);

export const OnboardingStepContent: React.FC = () => {
  const { 
    currentStep, 
    tenantInfo, 
    state: { stepData, isTransitioning },
    updateStepData,
    completeStep
  } = useOnboarding();

  if (!currentStep) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
          <div>
            <h3 className="font-medium text-lg">No Step Available</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Unable to load the current onboarding step
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Get the appropriate component for this step
  const StepComponent = STEP_COMPONENTS[currentStep.step_name as keyof typeof STEP_COMPONENTS] || CompanyProfileStep;
  
  const handleDataChange = (data: any) => {
    updateStepData(currentStep.id, data);
  };

  const handleComplete = (data: any) => {
    completeStep(currentStep.id, data);
  };

  if (isTransitioning) {
    return <StepContentSkeleton />;
  }

  return (
    <div className="animate-in fade-in-50 duration-500">
      <Suspense fallback={<StepContentSkeleton />}>
        <StepComponent
          tenantId={tenantInfo?.id || ''}
          tenantInfo={tenantInfo}
          data={stepData[currentStep.id] || {}}
          onDataChange={handleDataChange}
          onComplete={handleComplete}
          step={currentStep}
        />
      </Suspense>
    </div>
  );
};
