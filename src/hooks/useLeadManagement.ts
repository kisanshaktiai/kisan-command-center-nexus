
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import type { Lead, LeadAssignmentRule } from '@/types/leads';
import { LeadService } from '@/services/LeadService';
import { useLeadService } from './useLeadService';
import { useNotifications } from './useNotifications';

export const useLeads = () => {
  const queryClient = useQueryClient();

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('leads-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          console.log('Real-time leads update:', payload);
          queryClient.invalidateQueries({ queryKey: ['leads'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const result = await LeadService.getLeads();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data || [];
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useLeadAssignmentRules = () => {
  const queryClient = useQueryClient();

  // Set up real-time subscription for assignment rules
  useEffect(() => {
    const channel = supabase
      .channel('lead-assignment-rules-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_assignment_rules',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['lead-assignment-rules'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['lead-assignment-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_assignment_rules')
        .select('*')
        .order('priority_order', { ascending: true });

      if (error) throw error;
      return data as LeadAssignmentRule[];
    },
  });
};

export const useCreateAssignmentRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rule: Omit<LeadAssignmentRule, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('lead_assignment_rules')
        .insert(rule)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-assignment-rules'] });
    },
  });
};

export const useReassignLead = () => {
  const queryClient = useQueryClient();
  const { assignLead } = useLeadService();

  return useMutation({
    mutationFn: async ({ leadId, newAdminId, reason }: { 
      leadId: string; 
      newAdminId: string; 
      reason?: string; 
    }) => {
      return await assignLead({ leadId, adminId: newAdminId, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (error) => {
      console.error('Lead reassignment failed:', error);
    },
  });
};

export const useUpdateLeadStatus = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError, showLoading, dismiss } = useNotifications();

  return useMutation({
    mutationFn: async ({ leadId, status, notes }: { 
      leadId: string; 
      status: Lead['status']; 
      notes?: string; 
    }) => {
      console.log('Starting lead status update:', { leadId, status, notes });
      
      const loadingToast = showLoading(`Updating lead status to ${status}...`);
      
      try {
        // Use the LeadService with proper error handling
        const result = await LeadService.updateLead(leadId, { 
          status, 
          notes,
          ...(status === 'contacted' && { last_contact_at: new Date().toISOString() })
        });

        dismiss(loadingToast);

        if (!result.success) {
          throw new Error(result.error || 'Update failed');
        }

        if (!result.data) {
          throw new Error('No data returned from update operation');
        }

        console.log('Lead status update successful:', result.data);
        showSuccess(`Lead status updated to ${status}`, {
          description: 'The lead has been successfully updated.',
        });

        return result.data;
      } catch (error) {
        dismiss(loadingToast);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Lead status update failed:', {
          error: errorMessage,
          leadId,
          status,
          stack: error instanceof Error ? error.stack : undefined
        });

        showError('Failed to update lead status', {
          description: errorMessage,
        });

        throw error;
      }
    },
    onSuccess: (data, variables) => {
      console.log('Lead status mutation successful for:', variables.leadId);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-analytics'] });
    },
    onError: (error, variables) => {
      console.error('Lead status mutation error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        leadId: variables.leadId,
        status: variables.status,
        timestamp: new Date().toISOString()
      });
    },
  });
};

export const useConvertLeadToTenant = () => {
  const queryClient = useQueryClient();
  const { convertToTenant } = useLeadService();

  return useMutation({
    mutationFn: async ({ 
      leadId, 
      tenantName, 
      tenantSlug, 
      subscriptionPlan, 
      adminEmail, 
      adminName 
    }: {
      leadId: string;
      tenantName: string;
      tenantSlug: string;
      subscriptionPlan?: string;
      adminEmail?: string;
      adminName?: string;
    }) => {
      console.log('Converting lead to tenant:', {
        leadId,
        tenantName,
        tenantSlug,
        subscriptionPlan
      });

      const result = await convertToTenant({
        leadId,
        tenantName,
        tenantSlug,
        subscriptionPlan,
        adminEmail,
        adminName,
      });

      if (!result) {
        throw new Error('Failed to convert lead to tenant - no result returned');
      }

      console.log('Lead conversion successful:', result);
      return result;
    },
    onSuccess: (data, variables) => {
      console.log('Lead converted to tenant successfully:', variables.tenantName);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
    onError: (error, variables) => {
      console.error('Failed to convert lead to tenant:', {
        error: error.message,
        leadId: variables.leadId,
        tenantName: variables.tenantName
      });
    },
  });
};
