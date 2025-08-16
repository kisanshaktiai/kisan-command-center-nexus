
import React from 'react';
import { TenantFormData } from '@/types/tenant';
import { TenantBasicInfoSection } from './form-sections/TenantBasicInfoSection';
import { TenantSlugSection } from './form-sections/TenantSlugSection';
import { TenantAdminSection } from './form-sections/TenantAdminSection';

interface TenantFormBasicRefactoredProps {
  formData: TenantFormData;
  onFieldChange: (field: keyof TenantFormData, value: string | number) => void;
  currentTenantId?: string;
}

export const TenantFormBasicRefactored: React.FC<TenantFormBasicRefactoredProps> = ({
  formData,
  onFieldChange,
  currentTenantId
}) => {
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
