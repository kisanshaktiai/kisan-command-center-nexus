
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import type { Lead, LeadAssignmentRule } from '@/types/leads';
import { LeadService } from '@/services/LeadService';
import { useLeadService } from './useLeadService';

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
  });
};

export const useUpdateLeadStatus = () => {
  const queryClient = useQueryClient();
  const { updateLead } = useLeadService();

  return useMutation({
    mutationFn: async ({ leadId, status, notes }: { 
      leadId: string; 
      status: Lead['status']; 
      notes?: string; 
    }) => {
      // Optimistic update
      const previousLeads = queryClient.getQueryData(['leads']);
      queryClient.setQueryData(['leads'], (old: Lead[] = []) =>
        old.map(lead => 
          lead.id === leadId 
            ? { ...lead, status, notes, updated_at: new Date().toISOString() }
            : lead
        )
      );

      try {
        const result = await updateLead(leadId, { status, notes });
        if (!result) {
          // Revert optimistic update on error
          queryClient.setQueryData(['leads'], previousLeads);
          throw new Error('Failed to update lead status');
        }
        return result;
      } catch (error) {
        // Revert optimistic update on error
        queryClient.setQueryData(['leads'], previousLeads);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
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
      const result = await convertToTenant({
        leadId,
        tenantName,
        tenantSlug,
        subscriptionPlan,
        adminEmail,
        adminName,
      });

      if (!result) {
        throw new Error('Failed to convert lead to tenant');
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
};
