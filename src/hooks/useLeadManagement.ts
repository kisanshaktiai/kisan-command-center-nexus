
import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
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

// Export individual hooks for backward compatibility
export const useLeads = () => {
  const leadService = useLeadService();
  
  return useQuery({
    queryKey: ['leads'],
    queryFn: () => leadService.getLeads(),
    staleTime: 30000,
  });
};

export const useUpdateLeadStatus = () => {
  const leadService = useLeadService();
  const { showSuccess, showError } = useNotifications();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, status, notes }: { leadId: string; status: Lead['status']; notes?: string }) => {
      const updateData: any = { status };
      if (notes) updateData.notes = notes;
      if (status === 'contacted') updateData.last_contact_at = new Date().toISOString();
      if (status === 'converted') updateData.converted_at = new Date().toISOString();
      
      return await leadService.updateLead(leadId, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      showSuccess('Lead status updated successfully');
    },
    onError: (error) => {
      console.error('Lead status update failed:', error);
      showError(error instanceof Error ? error.message : 'Failed to update lead status');
    }
  });
};

export const useConvertLeadToTenant = () => {
  const leadService = useLeadService();
  const { showSuccess, showError } = useNotifications();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      leadId: string;
      tenantName: string;
      tenantSlug: string;
      subscriptionPlan: string;
      adminEmail: string;
      adminName: string;
    }) => {
      const result = await leadService.convertToTenant(data);
      if (!result) {
        throw new Error('Failed to convert lead to tenant');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      showSuccess('Lead successfully converted to tenant! Welcome email sent.');
    },
    onError: (error) => {
      console.error('Lead conversion failed:', error);
      if (error instanceof Error) {
        if (error.message.includes('already exists') || error.message.includes('SLUG_CONFLICT')) {
          showError('Tenant slug already exists. Please choose a different name.');
        } else {
          showError(error.message);
        }
      } else {
        showError('Failed to convert lead to tenant');
      }
    }
  });
};

export const useReassignLead = () => {
  const leadService = useLeadService();
  const { showSuccess, showError } = useNotifications();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, adminId, reason }: { leadId: string; adminId: string; reason?: string }) => {
      return await leadService.assignLead({ leadId, adminId, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      showSuccess('Lead reassigned successfully');
    },
    onError: (error) => {
      console.error('Lead reassignment failed:', error);
      showError(error instanceof Error ? error.message : 'Failed to reassign lead');
    }
  });
};

// Placeholder hooks for features not yet implemented
export const useLeadAssignmentRules = () => {
  return useQuery({
    queryKey: ['lead-assignment-rules'],
    queryFn: () => Promise.resolve([]),
    enabled: false
  });
};

export const useCreateAssignmentRule = () => {
  const { showSuccess, showError } = useNotifications();

  return useMutation({
    mutationFn: async (ruleData: any) => {
      // Placeholder implementation
      console.log('Creating assignment rule:', ruleData);
      return Promise.resolve(ruleData);
    },
    onSuccess: () => {
      showSuccess('Assignment rule created successfully');
    },
    onError: (error) => {
      showError('Failed to create assignment rule');
    }
  });
};
