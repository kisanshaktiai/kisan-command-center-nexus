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
        console.error('Authentication check failed:', authError);
        throw new Error('Authentication required to create tenant');
      }

      console.log('Authenticated user:', user.id, user.email);

      // Generate correlation ID for tracking
      const correlationId = `tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('Calling create-tenant-with-admin edge function with correlation ID:', correlationId);
      
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

      console.log('Edge function response:', { response, error });

      if (error) {
        console.error('Edge function error:', error);
        // Provide more specific error messages based on the error
        if (error.message?.includes('Authentication')) {
          throw new Error('Authentication failed. Please log in and try again.');
        } else if (error.message?.includes('Failed to fetch')) {
          throw new Error('Network error. Please check your connection and try again.');
        } else {
          throw new Error(error.message || 'Failed to create tenant');
        }
      }

      if (!response?.success) {
        console.error('Tenant creation failed:', response);
        const errorMessage = response?.error || 'Failed to create tenant';
        
        // Provide user-friendly error messages based on error codes
        if (response?.code === 'INSUFFICIENT_PRIVILEGES') {
          throw new Error('You do not have permission to create tenants.');
        } else if (response?.code === 'MISSING_FIELDS') {
          throw new Error('Please fill in all required fields.');
        } else if (response?.code === 'TENANT_CREATION_ERROR') {
          throw new Error(`Failed to create tenant: ${response?.details?.message || errorMessage}`);
        } else if (response?.code === 'ADMIN_USER_CREATION_ERROR') {
          throw new Error(`Failed to create admin user: ${response?.details?.message || errorMessage}`);
        } else if (response?.code === 'USER_TENANT_RELATIONSHIP_ERROR') {
          throw new Error('Failed to set up tenant permissions. Please contact support.');
        } else {
          throw new Error(errorMessage);
        }
      }

      console.log('Tenant creation successful:', response);
      return response;
    },
    onSuccess: (data) => {
      console.log('Tenant creation mutation succeeded:', data);
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
