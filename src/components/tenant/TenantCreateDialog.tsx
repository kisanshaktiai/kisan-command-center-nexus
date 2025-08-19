import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';
import { useCreateTenant } from '@/data/hooks/useTenants';
import { TenantFormData, CreateTenantDTO, TenantType, TenantStatus, SubscriptionPlan, TenantTypeValue, TenantStatusValue, SubscriptionPlanValue } from '@/types/tenant';
import { TenantForm } from './TenantForm';

interface TenantCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const TenantCreateDialog: React.FC<TenantCreateDialogProps> = ({ 
  isOpen, 
  onClose,
  onSuccess 
}) => {
  const { mutate: createTenant, isPending: isCreating } = useCreateTenant();

  const handleClose = () => {
    onClose();
  };

  const handleSuccess = () => {
    onSuccess?.();
    handleClose();
  };

  const handleSubmit = async (tenantData: TenantFormData): Promise<boolean> => {
    try {
      // Convert TenantFormData to CreateTenantDTO
      const createData: CreateTenantDTO = {
        name: tenantData.name,
        slug: tenantData.slug,
        type: tenantData.type as TenantTypeValue,
        status: tenantData.status as TenantStatusValue,
        subscription_plan: tenantData.subscription_plan as SubscriptionPlanValue,
        owner_name: tenantData.owner_name,
        owner_email: tenantData.owner_email,
        owner_phone: tenantData.owner_phone,
        business_registration: tenantData.business_registration,
        business_address: tenantData.business_address,
        established_date: tenantData.established_date,
        subscription_start_date: tenantData.subscription_start_date,
        subscription_end_date: tenantData.subscription_end_date,
        trial_ends_at: tenantData.trial_ends_at,
        max_farmers: tenantData.max_farmers,
        max_dealers: tenantData.max_dealers,
        max_products: tenantData.max_products,
        max_storage_gb: tenantData.max_storage_gb,
        max_api_calls_per_day: tenantData.max_api_calls_per_day,
        subdomain: tenantData.subdomain,
        custom_domain: tenantData.custom_domain,
        metadata: tenantData.metadata
      };

      await createTenantMutation.mutateAsync(createData);
      return true;
    } catch (error) {
      console.error('Failed to create tenant:', error);
      return false;
    }
  };

  const createTenantMutation = useCreateTenant();

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-4xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Create New Tenant</AlertDialogTitle>
          <AlertDialogDescription>
            Fill in the information below to create a new tenant.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <TenantForm 
          mode="create"
          onSubmit={handleSubmit}
          onCancel={handleClose}
          isSubmitting={createTenantMutation.isPending}
        />

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose} disabled={createTenantMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleSuccess} disabled={createTenantMutation.isPending}>
            {createTenantMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Tenant'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
