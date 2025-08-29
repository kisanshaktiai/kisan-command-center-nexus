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

interface TenantOnboardingWizardProps {
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

export const TenantOnboardingWizard: React.FC<TenantOnboardingWizardProps> = ({
  isOpen,
  onClose,
  tenantId
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepData, setStepData] = useState<Record<string, any>>({});

  const [steps, setSteps] = useState([
    { id: 'company-profile', title: 'Company Profile', description: 'Tell us about your company', status: 'in progress', component: CompanyProfileStep },
    { id: 'branding-design', title: 'Branding & Design', description: 'Customize your brand', status: 'pending', component: EnhancedBrandingStep },
    { id: 'users-roles', title: 'Team & Permissions', description: 'Invite team members and set roles', status: 'pending', component: TeamUsersRolesStep },
    { id: 'billing-plan', title: 'Billing & Plan', description: 'Choose your billing plan', status: 'pending', component: BillingPlanStep },
    { id: 'domain-whitelabel', title: 'Domain & White-label', description: 'Set up your domain', status: 'pending', component: DomainWhitelabelStep },
    { id: 'review-launch', title: 'Review & Launch', description: 'Review and launch your tenant', status: 'pending', component: ReviewGoLiveStep },
  ]);

  const currentProgress = useMemo(() => {
    const completedSteps = steps.filter(s => s.status === 'completed').length;
    return Math.round((completedSteps / steps.length) * 100);
  }, [steps]);

  const handleStepComplete = useCallback((stepId: string, data: any) => {
    setSteps(prevSteps =>
      prevSteps.map(step =>
        step.id === stepId
          ? { ...step, status: 'completed' }
          : step.status === 'in progress'
            ? step
            : step.status === 'pending'
              ? { ...step, status: 'in progress' }
              : step
      )
    );
    setStepData(prev => ({ ...prev, [stepId]: data }));
    setCurrentStepIndex(prevIndex => Math.min(prevIndex + 1, steps.length - 1));
  }, [steps.length]);

  const handlePrevious = () => {
    setCurrentStepIndex(prevIndex => Math.max(prevIndex - 1, 0));
  };

  const CurrentStepComponent = steps[currentStepIndex]?.component;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Tenant Onboarding Wizard</DialogTitle>
          <DialogDescription>
            Complete the following steps to set up your tenant.
          </DialogDescription>
          <Progress value={currentProgress} />
          <div>{currentProgress}% Complete</div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 border-r overflow-y-auto">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`p-4 cursor-pointer ${index === currentStepIndex ? 'bg-gray-100' : ''}`}
              >
                {step.title} - {step.status}
              </div>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {CurrentStepComponent && (
                <CurrentStepComponent
                  tenantId={tenantId}
                  onComplete={(data: any) => handleStepComplete(steps[currentStepIndex].id, data)}
                  data={stepData[steps[currentStepIndex].id] || {}}
                />
              )}
            </div>
          </div>
        </div>

        <div className="mt-auto p-4 border-t">
          <Button onClick={handlePrevious} disabled={currentStepIndex === 0}>
            Previous
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
