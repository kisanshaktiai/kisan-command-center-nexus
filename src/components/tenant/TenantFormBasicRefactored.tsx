
import React from 'react';
import { TenantFormData } from '@/types/tenant';
import { TenantBasicInfoSection } from './form-sections/TenantBasicInfoSection';
import { TenantSlugSection } from './form-sections/TenantSlugSection';
import { TenantAdminSection } from './form-sections/TenantAdminSection';
import { useAdminEmailValidation } from '@/hooks/useAdminEmailValidation';

interface TenantFormBasicRefactoredProps {
  formData: TenantFormData;
  onFieldChange: (field: keyof TenantFormData, value: string | number) => void;
  currentTenantId?: string;
  emailValidationState?: {
    isValidating: boolean;
    emailExists: boolean | null;
  };
  onEmailValidationStateChange?: (state: { isValidating: boolean; emailExists: boolean | null }) => void;
}

export const TenantFormBasicRefactored: React.FC<TenantFormBasicRefactoredProps> = ({
  formData,
  onFieldChange,
  currentTenantId,
  emailValidationState,
  onEmailValidationStateChange
}) => {
  const { isValidating, validationResult } = useAdminEmailValidation();

  // Update parent component with validation state changes
  React.useEffect(() => {
    if (onEmailValidationStateChange) {
      onEmailValidationStateChange({
        isValidating,
        emailExists: validationResult?.exists || null
      });
    }
  }, [isValidating, validationResult, onEmailValidationStateChange]);

  return (
    <div className="space-y-6">
      <TenantBasicInfoSection 
        formData={formData} 
        onFieldChange={onFieldChange} 
      />
      
      <TenantSlugSection 
        formData={formData} 
        onFieldChange={onFieldChange}
        currentTenantId={currentTenantId}
      />
      
      <TenantAdminSection 
        formData={formData} 
        onFieldChange={onFieldChange} 
      />
    </div>
  );
};
