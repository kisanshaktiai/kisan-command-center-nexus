
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { OnboardingProvider } from './OnboardingProvider';
import { OnboardingContent } from './OnboardingContent';
import { Sparkles } from 'lucide-react';

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
      <DialogContent className="max-w-7xl max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="px-8 pt-8 pb-6 border-b bg-gradient-to-r from-primary/5 to-primary/10">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="relative">
              <Sparkles className="w-7 h-7 text-primary" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary/20 rounded-full animate-ping"></div>
            </div>
            World-Class Tenant Onboarding
          </DialogTitle>
          <DialogDescription className="text-base">
            Complete your tenant setup with our guided onboarding experience
          </DialogDescription>
        </DialogHeader>
        
        <OnboardingProvider tenantId={tenantId} workflowId={workflowId}>
          <OnboardingContent />
        </OnboardingProvider>
      </DialogContent>
    </Dialog>
  );
};
