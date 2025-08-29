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

interface StabilizedTenantOnboardingWizardProps {
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

export const StabilizedTenantOnboardingWizard: React.FC<StabilizedTenantOnboardingWizardProps> = ({
  isOpen,
  onClose,
  tenantId
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepData, setStepData] = useState<Record<string, any>>({});

  const handleStepComplete = (data: any) => {
    // Logic to handle step completion
    console.log('Step completed with data:', data);
    if (currentStepIndex < Object.keys(STEP_COMPONENTS).length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      onClose(); // Close the wizard after the last step
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Tenant Onboarding Wizard</DialogTitle>
          <DialogDescription>
            Follow the steps to set up your tenant.
          </DialogDescription>
        </DialogHeader>
        
        {/* Render the current step component */}
        {Object.keys(STEP_COMPONENTS).map((stepName, index) => {
          const StepComponent = STEP_COMPONENTS[stepName];
          if (index === currentStepIndex) {
            return (
              <div key={stepName}>
                {/* @ts-expect-error */}
                <StepComponent
                  tenantId={tenantId}
                  onComplete={handleStepComplete}
                  data={stepData[stepName] || {}}
                  onDataChange={(data: any) => {
                    setStepData(prev => ({
                      ...prev,
                      [stepName]: data
                    }));
                  }}
                />
              </div>
            );
          }
          return null;
        })}
        
        {/* Navigation buttons */}
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
          <Button
            onClick={() => {
              if (currentStepIndex < Object.keys(STEP_COMPONENTS).length - 1) {
                setCurrentStepIndex(currentStepIndex + 1);
              } else {
                onClose();
              }
            }}
            disabled={currentStepIndex === Object.keys(STEP_COMPONENTS).length - 1}
          >
            Next
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
