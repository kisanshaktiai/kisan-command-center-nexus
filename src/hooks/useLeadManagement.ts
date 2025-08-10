
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

  const VALID_STATUSES = ['new', 'assigned', 'contacted', 'qualified', 'converted', 'rejected'] as const;
  
  const validateStatus = (status: string): boolean => {
    return VALID_STATUSES.includes(status as any);
  };

  return useMutation({
    mutationFn: async ({ leadId, status, notes }: { 
      leadId: string; 
      status: Lead['status']; 
      notes?: string; 
    }) => {
      console.log('Starting lead status update:', { leadId, status, notes });
      
      if (!validateStatus(status)) {
        throw new Error(`Invalid status: ${status}. Valid statuses are: ${VALID_STATUSES.join(', ')}`);
      }
      
      const loadingToast = showLoading(`Updating lead status to ${status}...`);
      
      try {
        console.log('LeadService: Validated status update request:', { leadId, status });
        
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
  const { showSuccess, showError, showLoading, dismiss } = useNotifications();

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
      // Validate required fields
      if (!leadId || !tenantName || !tenantSlug || !adminEmail || !adminName) {
        throw new Error('All fields are required for lead conversion');
      }

      console.log('Converting lead to tenant:', {
        leadId,
        tenantName,
        tenantSlug,
        subscriptionPlan,
        adminEmail,
        adminName
      });

      const loadingToast = showLoading('Converting lead to tenant...');

      try {
        // Ensure subscription plan is in the correct format
        const validPlans = ['Kisan_Basic', 'Shakti_Growth', 'AI_Enterprise', 'Custom_Enterprise'];
        const normalizedPlan = validPlans.includes(subscriptionPlan || '') 
          ? subscriptionPlan 
          : 'Kisan_Basic';

        console.log('Normalized subscription plan:', normalizedPlan);

        // Call the edge function with proper error handling
        const { data, error } = await supabase.functions.invoke('convert-lead-to-tenant', {
          body: {
            leadId,
            tenantName,
            tenantSlug,
            subscriptionPlan: normalizedPlan,
            adminEmail,
            adminName,
          }
        });

        dismiss(loadingToast);

        if (error) {
          console.error('Edge function invocation error:', error);
          throw new Error(`Conversion failed: ${error.message || 'Unknown error'}`);
        }

        // Handle edge function response
        if (!data) {
          throw new Error('No response data from conversion service');
        }

        console.log('Edge function response:', data);

        // Check if the response indicates success
        if (!data.success) {
          console.error('Conversion service returned error:', data);
          
          // Create a structured error with the code for better handling
          const error = new Error(data.error || 'Conversion failed');
          (error as any).code = data.code;
          
          // Handle specific error cases with user-friendly messages
          if (data.code === 'LEAD_NOT_QUALIFIED') {
            throw new Error('Only qualified leads can be converted to tenants. Please qualify the lead first.');
          } else if (data.code === 'LEAD_ALREADY_CONVERTED') {
            throw new Error('This lead has already been converted to a tenant.');
          } else if (data.code === 'SLUG_CONFLICT') {
            throw new Error('The tenant slug is already taken. Please choose a different one.');
          } else if (data.code === 'LEAD_NOT_FOUND') {
            throw new Error('Lead not found. Please refresh and try again.');
          }
          
          throw error;
        }

        console.log('Lead conversion successful:', data);
        
        showSuccess('Lead converted to tenant successfully', {
          description: `${tenantName} has been created and the lead has been marked as converted. Welcome email sent to ${adminEmail}.`,
        });
        
        return data;
      } catch (error) {
        dismiss(loadingToast);
        throw error; // Re-throw to be handled by the calling component
      }
    },
    onSuccess: (data, variables) => {
      console.log('Lead converted to tenant successfully:', variables.tenantName);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
    onError: (error, variables) => {
      console.error('Failed to convert lead to tenant:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        leadId: variables.leadId,
        tenantName: variables.tenantName,
        timestamp: new Date().toISOString()
      });
      
      // Don't show error toast here as it's handled in the component
      // This allows for better error message customization based on error codes
    },
  });
};
