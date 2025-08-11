
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLeadService } from './useLeadService';
import { useNotifications } from './useNotifications';
import type { Lead } from '@/types/leads';

export const useLeadManagement = () => {
  const [isLoading, setIsLoading] = useState(false);
  const leadService = useLeadService();
  const { showSuccess, showError } = useNotifications();
  const queryClient = useQueryClient();

  const updateLeadStatusMutation = useMutation({
    mutationFn: async ({ leadId, status, notes }: { leadId: string; status: Lead['status']; notes?: string }) => {
      // If converting from qualified to converted, trigger full conversion
      if (status === 'converted') {
        const lead = queryClient.getQueryData<Lead[]>(['leads'])?.find(l => l.id === leadId);
        if (lead && lead.status === 'qualified') {
          console.log('Converting qualified lead to tenant:', leadId);
          
          // Use the existing conversion service
          const conversionResult = await leadService.convertToTenant({
            leadId,
            tenantName: lead.organization_name || `${lead.contact_name} Organization`,
            tenantSlug: (lead.organization_name || lead.contact_name).toLowerCase().replace(/[^a-z0-9]/g, '-'),
            subscriptionPlan: 'Kisan_Basic',
            adminEmail: lead.email,
            adminName: lead.contact_name
          });

          if (!conversionResult) {
            throw new Error('Failed to convert lead to tenant');
          }

          return conversionResult;
        }
      }

      // For regular status updates
      return await leadService.updateLead(leadId, { 
        status, 
        notes,
        ...(status === 'converted' && { converted_at: new Date().toISOString() })
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      
      if (variables.status === 'converted') {
        showSuccess('Lead successfully converted to tenant! Welcome email sent.');
      } else {
        showSuccess('Lead status updated successfully');
      }
    },
    onError: (error) => {
      console.error('Lead status update failed:', error);
      showError(error instanceof Error ? error.message : 'Failed to update lead status');
    }
  });

  const handleStatusChange = async (leadId: string, newStatus: Lead['status'], notes?: string) => {
    try {
      await updateLeadStatusMutation.mutateAsync({ leadId, status: newStatus, notes });
    } catch (error) {
      console.error('Status change error:', error);
      throw error;
    }
  };

  return {
    isLoading: updateLeadStatusMutation.isPending,
    handleStatusChange,
    updateLeadStatusMutation
  };
};
