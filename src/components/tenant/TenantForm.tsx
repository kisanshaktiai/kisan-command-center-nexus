
import React from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Mail, CheckCircle } from 'lucide-react';
import { TenantFormData, Tenant } from '@/types/tenant';
import { useSlugValidation } from '@/hooks/useSlugValidation';
import { TenantFormBasic } from './TenantFormBasic';
import { TenantFormBusiness } from './TenantFormBusiness';
import { TenantFormLimits } from './TenantFormLimits';

interface TenantFormProps {
  formData: TenantFormData;
  setFormData: (data: TenantFormData) => void;
  onSubmit: () => void;
  isEditing: boolean;
  currentTenant?: Tenant;
}

export const TenantForm: React.FC<TenantFormProps> = ({ 
  formData, 
  setFormData, 
  onSubmit, 
  isEditing, 
  currentTenant 
}) => {
  const { isValid: isSlugValid, isChecking: isSlugChecking, error: slugError } = useSlugValidation(
    formData.slug || '', 
    isEditing ? currentTenant?.id : undefined
  );

  const handleFieldChange = (field: keyof TenantFormData, value: string | number | object) => {
    setFormData({ ...formData, [field]: value });
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isFormValid = () => {
    const baseValidation = (
      formData.name && 
      formData.slug && 
      isSlugValid && 
      formData.type && 
      formData.subscription_plan &&
      formData.subdomain
    );

    // For new tenants, require admin details
    if (!isEditing) {
      return baseValidation && 
        formData.owner_name && 
        formData.owner_email && 
        validateEmail(formData.owner_email);
    }

    return baseValidation;
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            {!isEditing && formData.owner_email && validateEmail(formData.owner_email) && (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
            Basic Info
          </TabsTrigger>
          <TabsTrigger value="business">Business Details</TabsTrigger>
          <TabsTrigger value="limits">Limits & Features</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          <TenantFormBasic
            formData={formData}
            onFieldChange={handleFieldChange}
            isSlugValid={isSlugValid}
            isSlugChecking={isSlugChecking}
            slugError={slugError}
          />
        </TabsContent>

        <TabsContent value="business" className="space-y-6">
          <TenantFormBusiness 
            formData={formData} 
            onFieldChange={handleFieldChange}
          />
        </TabsContent>

        <TabsContent value="limits" className="space-y-6">
          <TenantFormLimits
            formData={formData}
            onFieldChange={handleFieldChange}
          />
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-4">
        {!isEditing && (
          <div className="flex items-center text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg mr-auto">
            <Mail className="w-4 h-4 mr-2" />
            Welcome email will be sent automatically after creation
          </div>
        )}
        
        <Button 
          type="submit" 
          disabled={!isFormValid() || isSlugChecking}
          className="min-w-32"
        >
          {isSlugChecking ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          {isEditing ? 'Update Tenant' : 'Create Tenant & Send Welcome Email'}
        </Button>
      </div>
    </form>
  );
};
