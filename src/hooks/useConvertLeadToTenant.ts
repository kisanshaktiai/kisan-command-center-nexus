
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLeadService } from './useLeadService';
import { useNotifications } from './useNotifications';

interface ConvertLeadData {
  leadId: string;
  tenantName: string;
  tenantSlug: string;
  subscriptionPlan?: string;
  adminEmail?: string;
  adminName?: string;
}

export const useConvertLeadToTenant = () => {
  const queryClient = useQueryClient();
  const { convertToTenant } = useLeadService();
  const { showSuccess, showError } = useNotifications();

  return useMutation({
    mutationFn: async (data: ConvertLeadData) => {
      console.log('useConvertLeadToTenant: Starting conversion:', data);
      
      const result = await convertToTenant(data);
      
      if (!result) {
        throw new Error('Conversion failed - no result returned');
      }
      
      console.log('useConvertLeadToTenant: Conversion successful:', result);
      return result;
    },
    onSuccess: (result, variables) => {
      console.log('useConvertLeadToTenant: Mutation success:', result);
      showSuccess('Lead converted to tenant successfully!');
      
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['lead', variables.leadId] });
    },
    onError: (error: any, variables) => {
      console.error('useConvertLeadToTenant: Mutation error:', error);
      const errorMessage = error?.message || 'Failed to convert lead to tenant';
      showError(`Conversion failed: ${errorMessage}`);
      
      // Ensure lead status is not stuck in converting state
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', variables.leadId] });
    },
  });
};
