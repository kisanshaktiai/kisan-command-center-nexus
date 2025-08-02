
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';
import type { Lead, LeadAssignmentRule } from '@/types/leads';

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
          
          // Invalidate and refetch leads data
          queryClient.invalidateQueries({ queryKey: ['leads'] });
          
          // Show toast notifications for different events
          switch (payload.eventType) {
            case 'INSERT':
              toast.success('New lead added!', {
                description: `Lead: ${payload.new.contact_name}`,
              });
              break;
            case 'UPDATE':
              const oldStatus = payload.old?.status;
              const newStatus = payload.new?.status;
              if (oldStatus !== newStatus) {
                toast.info('Lead status updated', {
                  description: `${payload.new.contact_name}: ${oldStatus} → ${newStatus}`,
                });
              }
              break;
            case 'DELETE':
              toast.error('Lead removed', {
                description: `Lead: ${payload.old.contact_name}`,
              });
              break;
          }
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
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          assigned_admin:admin_users(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Lead[];
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
      toast.success('Assignment rule created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create assignment rule: ${error.message}`);
    },
  });
};

export const useReassignLead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, newAdminId, reason }: { 
      leadId: string; 
      newAdminId: string; 
      reason?: string; 
    }) => {
      const { data, error } = await supabase.rpc('reassign_lead', {
        p_lead_id: leadId,
        p_new_admin_id: newAdminId,
        p_reason: reason,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead reassigned successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to reassign lead: ${error.message}`);
    },
  });
};

export const useUpdateLeadStatus = () => {
  const queryClient = useQueryClient();

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
        const { data, error } = await supabase
          .from('leads')
          .update({ 
            status, 
            notes,
            last_contact_at: status === 'contacted' ? new Date().toISOString() : undefined,
            updated_at: new Date().toISOString()
          })
          .eq('id', leadId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        // Revert optimistic update on error
        queryClient.setQueryData(['leads'], previousLeads);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead status updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update lead status: ${error.message}`);
    },
  });
};

export const useConvertLeadToTenant = () => {
  const queryClient = useQueryClient();

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
      const { data, error } = await supabase.rpc('convert_lead_to_tenant', {
        p_lead_id: leadId,
        p_tenant_name: tenantName,
        p_tenant_slug: tenantSlug,
        p_subscription_plan: subscriptionPlan,
        p_admin_email: adminEmail,
        p_admin_name: adminName,
      });

      if (error) throw error;
      return data as { success: boolean; error?: string; tenant_id?: string; invitation_token?: string; message?: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      if (data?.success) {
        toast.success('Lead converted to tenant successfully');
      } else {
        toast.error(data?.error || 'Failed to convert lead');
      }
    },
    onError: (error: any) => {
      toast.error(`Failed to convert lead: ${error.message}`);
    },
  });
};
