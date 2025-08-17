
import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { OnboardingProvider } from '@/components/onboarding/OnboardingProvider';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { OnboardingSidebar } from '@/components/onboarding/OnboardingSidebar';
import { OnboardingStepContent } from '@/components/onboarding/OnboardingStepContent';
import { OnboardingFooter } from '@/components/onboarding/OnboardingFooter';

interface OnboardingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  workflowId?: string;
}

export const OnboardingDialog: React.FC<OnboardingDialogProps> = ({
  isOpen,
  onClose,
  tenantId,
  workflowId
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-full h-[90vh] p-0 overflow-hidden">
        <OnboardingProvider tenantId={tenantId} workflowId={workflowId}>
          <div className="flex flex-col h-full">
            <OnboardingHeader onClose={onClose} />
            
            <div className="flex flex-1 overflow-hidden">
              <OnboardingSidebar />
              <div className="flex-1 flex flex-col overflow-hidden">
                <OnboardingStepContent />
                <OnboardingFooter />
              </div>
            </div>
          </div>
        </OnboardingProvider>
      </DialogContent>
    </Dialog>
  );
};
