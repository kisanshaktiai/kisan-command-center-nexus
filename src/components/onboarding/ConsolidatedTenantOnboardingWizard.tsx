import React, { useState, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, ArrowLeft, ArrowRight, Sparkles, RefreshCw } from 'lucide-react';
import { CompanyProfileStep } from './steps/CompanyProfileStep';
import { EnhancedBrandingStep } from './steps/EnhancedBrandingStep';
import { TeamUsersRolesStep } from './steps/TeamUsersRolesStep';
import { BillingPlanStep } from './steps/BillingPlanStep';
import { DomainWhitelabelStep } from './steps/DomainWhitelabelStep';
import { ReviewGoLiveStep } from './steps/ReviewGoLiveStep';

interface ConsolidatedTenantOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
}

const STEP_COMPONENTS: Record<string, React.ComponentType<any>> = {
  'Company Profile': CompanyProfileStep,
  'Branding & Design': EnhancedBrandingStep,
  'Enhanced Branding': EnhancedBrandingStep,
  'Team & Permissions': TeamUsersRolesStep,
  'Enhanced Users & Roles': TeamUsersRolesStep,
  'Team Users & Roles': TeamUsersRolesStep,
  'Billing & Plan': BillingPlanStep,
  'Domain & White-label': DomainWhitelabelStep,
  'Domain & Branding': DomainWhitelabelStep,
  'Review & Launch': ReviewGoLiveStep,
  'Review & Go Live': ReviewGoLiveStep
};

export const ConsolidatedTenantOnboardingWizard: React.FC<ConsolidatedTenantOnboardingWizardProps> = ({
  isOpen,
  onClose,
  tenantId
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepData, setStepData] = useState({});

  const steps = useMemo(() => {
    return [
      {
        id: 'company-profile',
        title: 'Company Profile',
        description: 'Provide basic information about your company',
        component: CompanyProfileStep
      },
      {
        id: 'branding-design',
        title: 'Branding & Design',
        description: 'Customize the look and feel of your platform',
        component: EnhancedBrandingStep
      },
      {
        id: 'team-permissions',
        title: 'Team & Permissions',
        description: 'Invite team members and set their roles',
        component: TeamUsersRolesStep
      },
      {
        id: 'billing-plan',
        title: 'Billing & Plan',
        description: 'Choose a billing plan that suits your needs',
        component: BillingPlanStep
      },
      {
        id: 'domain-whitelabel',
        title: 'Domain & White-label',
        description: 'Set up your custom domain and white-label settings',
        component: DomainWhitelabelStep
      },
      {
        id: 'review-go-live',
        title: 'Review & Go Live',
        description: 'Review your settings and launch your platform',
        component: ReviewGoLiveStep
      }
    ];
  }, []);

  const currentProgress = useMemo(() => {
    return Math.round(((currentStepIndex + 1) / steps.length) * 100);
  }, [currentStepIndex, steps.length]);

  const handleStepComplete = useCallback((data) => {
    setStepData(prev => ({ ...prev, [steps[currentStepIndex].id]: data }));
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  }, [currentStepIndex, steps, setStepData]);
  
  const CurrentStepComponent = steps[currentStepIndex]?.component;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Tenant Onboarding</DialogTitle>
          <DialogDescription>
            Complete the following steps to set up your tenant.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col">
          <div className="space-y-4">
            <Progress value={currentProgress} />
            <div>
              Step {currentStepIndex + 1} of {steps.length}: {steps[currentStepIndex]?.title}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {CurrentStepComponent && (
              <CurrentStepComponent
                tenantId={tenantId}
                onComplete={handleStepComplete}
                data={stepData[steps[currentStepIndex].id] || {}}
                onDataChange={(data) => {
                  setStepData(prev => ({
                    ...prev,
                    [steps[currentStepIndex].id]: data
                  }));
                }}
              />
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-between">
          <Button
            variant="outline"
            onClick={() => {
              if (currentStepIndex > 0) {
                setCurrentStepIndex(currentStepIndex - 1);
              }
            }}
            disabled={currentStepIndex === 0}
          >
            Previous
          </Button>
          <Button onClick={onClose} disabled={currentStepIndex < steps.length - 1}>
            {currentStepIndex === steps.length - 1 ? 'Close' : 'Skip for Now'}
          </Button>
          <Button onClick={() => handleStepComplete({})} disabled={!CurrentStepComponent}>
            {currentStepIndex === steps.length - 1 ? 'Finish' : 'Next'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
