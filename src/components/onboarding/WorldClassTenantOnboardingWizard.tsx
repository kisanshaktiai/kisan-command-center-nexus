
import React from 'react';
import { OnboardingDialog } from './OnboardingDialog';

interface WorldClassTenantOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  workflowId?: string;
}

export const WorldClassTenantOnboardingWizard: React.FC<WorldClassTenantOnboardingWizardProps> = (props) => {
  return <OnboardingDialog {...props} />;
};
