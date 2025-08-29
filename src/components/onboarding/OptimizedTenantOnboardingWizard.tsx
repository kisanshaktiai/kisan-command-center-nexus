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

interface OptimizedTenantOnboardingWizardProps {
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

export const OptimizedTenantOnboardingWizard: React.FC<OptimizedTenantOnboardingWizardProps> = ({
  isOpen,
  onClose,
  tenantId
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepData, setStepData] = useState<Record<string, any>>({});

  const steps = useMemo(() => {
    return Object.keys(STEP_COMPONENTS);
  }, []);

  const currentProgress = useMemo(() => {
    return ((currentStepIndex + 1) / steps.length) * 100;
  }, [currentStepIndex, steps.length]);

  const handleStepComplete = (data: any) => {
    setStepData(prev => ({
      ...prev,
      [steps[currentStepIndex]]: data
    }));
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      onClose();
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Tenant Onboarding Wizard</DialogTitle>
          <DialogDescription>
            Step {currentStepIndex + 1} of {steps.length}
          </DialogDescription>
        </DialogHeader>

        <Progress value={currentProgress} className="mb-4" />

        <div className="flex-1 overflow-y-auto">
          {React.createElement(STEP_COMPONENTS[steps[currentStepIndex]], {
            tenantId: tenantId,
            onComplete: handleStepComplete,
            data: stepData[steps[currentStepIndex]] || {},
            onDataChange: (data: any) => {
              setStepData(prev => ({
                ...prev,
                [steps[currentStepIndex]]: data
              }));
            }
          })}
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
          <Button onClick={onClose}>
            {currentStepIndex === steps.length - 1 ? 'Close' : 'Skip for Now'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
