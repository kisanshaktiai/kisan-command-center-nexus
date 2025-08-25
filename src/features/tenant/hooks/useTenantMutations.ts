
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreateTenantDTO, UpdateTenantDTO, Tenant } from '@/types/tenant';
import { tenantBusinessService } from '@/tenant/TenantBusinessService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useTenantMutations = () => {
  const queryClient = useQueryClient();

  const createTenantMutation = useMutation({
    mutationFn: async (data: CreateTenantDTO) => {
      console.log('Creating tenant with data:', data);
      
      // Get current authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required to create tenant');
      }

      console.log('Authenticated user:', user.id);

      // Generate correlation ID for tracking
      const correlationId = `tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Call the enhanced Edge Function
      const { data: response, error } = await supabase.functions.invoke('create-tenant-with-admin', {
        body: {
          ...data,
          metadata: {
            ...data.metadata,
            created_via: 'admin_ui',
            correlation_id: correlationId
          }
        },
        headers: {
          'X-Request-ID': correlationId,
          'X-Correlation-ID': correlationId
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to create tenant');
      }

      if (!response?.success) {
        console.error('Tenant creation failed:', response);
        throw new Error(response?.error || 'Failed to create tenant');
      }

      console.log('Tenant creation successful:', response);
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success(`Tenant "${data.tenant_name}" created successfully!`);
    },
    onError: (error: Error) => {
      console.error('Create tenant mutation error:', error);
      toast.error(`Failed to create tenant: ${error.message}`);
    },
  });

  const updateTenantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTenantDTO }) => {
      const result = await tenantBusinessService.updateTenant(id, data);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant updated successfully');
    },
    onError: (error: Error) => {
      console.error('Update tenant mutation error:', error);
      toast.error(`Failed to update tenant: ${error.message}`);
    },
  });

  const deleteTenantMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await tenantBusinessService.suspendTenant(id, 'Deleted by admin');
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant suspended successfully');
    },
    onError: (error: Error) => {
      console.error('Delete tenant mutation error:', error);
      toast.error(`Failed to suspend tenant: ${error.message}`);
    },
  });

  const reactivateTenantMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await tenantBusinessService.reactivateTenant(id);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant reactivated successfully');
    },
    onError: (error: Error) => {
      console.error('Reactivate tenant mutation error:', error);
      toast.error(`Failed to reactivate tenant: ${error.message}`);
    },
  });

  const isSubmitting = createTenantMutation.isPending || 
                      updateTenantMutation.isPending || 
                      deleteTenantMutation.isPending ||
                      reactivateTenantMutation.isPending;

  return {
    createTenantMutation,
    updateTenantMutation,
    deleteTenantMutation,
    reactivateTenantMutation,
    isSubmitting,
  };
};
