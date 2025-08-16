
import React, { useState, useEffect } from 'react';
import { TenantFormData } from '@/types/tenant';
import { TenantBasicInfoSection } from './form-sections/TenantBasicInfoSection';
import { TenantSlugSection } from './form-sections/TenantSlugSection';
import { TenantAdminSection } from './form-sections/TenantAdminSection';
import { useTenantUserManagement } from '@/hooks/useTenantUserManagement';

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
  const { checkUserExists, isCheckingUser } = useTenantUserManagement();
  const [emailExists, setEmailExists] = useState<boolean | null>(null);

  // Check if email exists when owner_email changes
  useEffect(() => {
    const checkEmail = async () => {
      if (!formData.owner_email || !formData.owner_email.includes('@')) {
        setEmailExists(null);
        return;
      }

      try {
        const result = await checkUserExists(formData.owner_email);
        if (result) {
          setEmailExists(result.exists);
        }
      } catch (error) {
        console.error('Error checking email:', error);
        setEmailExists(null);
      }
    };

    // Debounce the email check
    const timeoutId = setTimeout(checkEmail, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.owner_email, checkUserExists]);

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
