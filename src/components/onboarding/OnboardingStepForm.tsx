
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { OnboardingStep } from '@/types/onboarding';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { BusinessVerificationForm } from './forms/BusinessVerificationForm';
import { PlanSelectionForm } from './forms/PlanSelectionForm';
import { BrandingForm } from './forms/BrandingForm';

interface OnboardingStepFormProps {
  step: OnboardingStep;
  stepIndex: number;
}

export const OnboardingStepForm: React.FC<OnboardingStepFormProps> = ({ step, stepIndex }) => {
  const { formData, updateStepData, validationErrors } = useOnboarding();
  
  const stepKey = step.step_name.toLowerCase().replace(/\s+/g, '');

  const handleDataChange = async (data: any) => {
    await updateStepData(stepKey, data);
  };

  const renderStepContent = () => {
    switch (stepKey) {
      case 'businessverification':
        const businessData = (formData.businessverification || {}) as {
          companyName?: string;
          gstNumber?: string;
          panNumber?: string;
          registrationCertificate?: string;
          addressProof?: string;
        };
        return (
          <BusinessVerificationForm
            data={businessData}
            onDataChange={handleDataChange}
          />
        );
      case 'planselection':
        const planData = (formData.planselection || {}) as {
          planType?: 'Kisan_Basic' | 'Shakti_Growth' | 'AI_Enterprise';
          billingCycle?: 'monthly' | 'quarterly' | 'annually';
          addOns?: string[];
        };
        return (
          <PlanSelectionForm
            data={planData}
            onDataChange={handleDataChange}
          />
        );
      case 'branding':
        const brandingData = (formData.branding || {}) as {
          logo?: string;
          primaryColor?: string;
          secondaryColor?: string;
          companyDescription?: string;
        };
        return (
          <BrandingForm
            data={brandingData}
            onDataChange={handleDataChange}
          />
        );
      default:
        return (
          <div className="text-center py-12">
            <p className="text-gray-500">
              Form configuration for "{step.step_name}" is not yet implemented.
            </p>
            <p className="text-sm text-gray-400 mt-2">
              This step will be available soon.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Validation Errors */}
      {validationErrors[stepKey] && validationErrors[stepKey].length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors[stepKey].map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {renderStepContent()}
    </div>
  );
};
