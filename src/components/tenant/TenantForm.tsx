
import React from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from 'lucide-react';
import { TenantFormData } from '@/types/tenant';
import { useSlugValidation } from '@/hooks/useSlugValidation';
import { TenantFormBasic } from './TenantFormBasic';
import { TenantFormBranding } from './TenantFormBranding';
import { TenantFormLimits } from './TenantFormLimits';

interface TenantFormProps {
  formData: TenantFormData;
  setFormData: (data: TenantFormData) => void;
  onSubmit: () => void;
  isEditing: boolean;
}

export const TenantForm: React.FC<TenantFormProps> = ({ formData, setFormData, onSubmit, isEditing }) => {
  const { isValid: isSlugValid, isChecking: isSlugChecking, error: slugError } = useSlugValidation(formData.slug || '');

  const handleFieldChange = (field: keyof TenantFormData, value: string | number) => {
    setFormData({ ...formData, [field]: value });
  };

  const isFormValid = () => {
    return formData.name && formData.slug && isSlugValid && formData.type && formData.subscription_plan;
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
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

        <TabsContent value="branding" className="space-y-6">
          <TenantFormBranding formData={formData} />
        </TabsContent>

        <TabsContent value="limits" className="space-y-6">
          <TenantFormLimits
            formData={formData}
            onFieldChange={handleFieldChange}
          />
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-4">
        <Button 
          type="submit" 
          disabled={!isFormValid() || isSlugChecking}
          className="min-w-32"
        >
          {isSlugChecking ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          {isEditing ? 'Update Tenant' : 'Create Tenant'}
        </Button>
      </div>
    </form>
  );
};
