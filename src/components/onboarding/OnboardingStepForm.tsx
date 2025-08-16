
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
  const currentData = formData[stepKey as keyof typeof formData] || {};

  const handleDataChange = async (data: any) => {
    await updateStepData(stepKey, data);
  };

  const renderStepContent = () => {
    switch (stepKey) {
      case 'businessverification':
        return (
          <BusinessVerificationForm
            data={currentData}
            onDataChange={handleDataChange}
          />
        );
      case 'planselection':
        return (
          <PlanSelectionForm
            data={currentData}
            onDataChange={handleDataChange}
          />
        );
      case 'branding':
        return (
          <BrandingForm
            data={currentData}
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
