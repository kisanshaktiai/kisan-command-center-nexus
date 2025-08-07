
import React from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Mail, CheckCircle, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TenantFormData, Tenant } from '@/types/tenant';
import { useTenantFormNavigation } from '@/hooks/useTenantFormNavigation';
import { TenantFormBasic } from './TenantFormBasic';
import { TenantFormBusiness } from './TenantFormBusiness';
import { TenantFormLimits } from './TenantFormLimits';
import { TenantFormBranding } from './TenantFormBranding';

interface TenantFormProps {
  formData: TenantFormData;
  setFormData: (data: TenantFormData) => void;
  onSubmit: () => void;
  isEditing: boolean;
  currentTenant?: Tenant;
  isSubmitting?: boolean;
}

export const TenantForm: React.FC<TenantFormProps> = ({ 
  formData, 
  setFormData, 
  onSubmit, 
  isEditing, 
  currentTenant,
  isSubmitting = false
}) => {
  const {
    currentTab,
    tabs,
    canGoNext,
    canGoPrevious,
    canAdvance,
    goNext,
    goPrevious,
    goToTab,
    isFormComplete,
    getCurrentTabValidation
  } = useTenantFormNavigation(formData, isEditing, true, false);

  const handleFieldChange = (field: keyof TenantFormData, value: string | number | object) => {
    setFormData({ ...formData, [field]: value });
  };

  const currentValidation = getCurrentTabValidation();

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-6">
      <Tabs value={currentTab} onValueChange={goToTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {tabs.map((tab) => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id} 
              className="flex items-center gap-2"
              disabled={!tab.validation.isValid && tab.id !== currentTab}
            >
              {tab.validation.isValid && (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
              {!tab.validation.isValid && tab.validation.errors.length > 0 && tab.id !== currentTab && (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              {tab.label}
            </TabsTrigger>
          ))}
          <TabsTrigger value="branding">Branding</TabsTrigger>
        </TabsList>

        {/* Show current tab validation errors */}
        {!currentValidation.isValid && currentValidation.errors.length > 0 && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-medium">Please fix the following issues:</div>
                <ul className="list-disc list-inside space-y-1">
                  {currentValidation.errors.map((error, index) => (
                    <li key={index} className="text-sm">{error}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <TabsContent value="basic" className="space-y-6">
          <TenantFormBasic
            formData={formData}
            onFieldChange={handleFieldChange}
            currentTenantId={isEditing ? currentTenant?.id : undefined}
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

        <TabsContent value="branding" className="space-y-6">
          <TenantFormBranding formData={formData} />
        </TabsContent>
      </Tabs>

      {/* Navigation and Submit Controls */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={goPrevious}
            disabled={!canGoPrevious}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          
          {canGoNext && (
            <Button
              type="button"
              onClick={goNext}
              disabled={!canAdvance}
              className="flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4">
          {!isEditing && (
            <div className="flex items-center text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
              <Mail className="w-4 h-4 mr-2" />
              Welcome email will be sent automatically after creation
            </div>
          )}
          
          <Button 
            type="submit" 
            disabled={!isFormComplete || isSubmitting}
            className="min-w-32"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            {isEditing ? 'Update Tenant' : 'Create Tenant & Send Welcome Email'}
          </Button>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Progress: {tabs.filter(tab => tab.validation.isValid).length} of {tabs.length} sections completed</span>
          <div className="flex items-center gap-1">
            {tabs.map((tab, index) => (
              <div
                key={tab.id}
                className={`w-2 h-2 rounded-full ${
                  tab.validation.isValid ? 'bg-green-500' : 
                  tab.id === currentTab ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </form>
  );
};
