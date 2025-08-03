
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import type { Lead } from '@/types/leads';
import { LeadService } from '@/services/LeadService';
import { useLeadService } from './useLeadService';
import { useNotifications } from './useNotifications';

export const useEnhancedLeads = () => {
  const queryClient = useQueryClient();

  // Set up real-time subscription with enhanced error handling
  useEffect(() => {
    const channel = supabase
      .channel('leads-realtime-enhanced')
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
          queryClient.invalidateQueries({ queryKey: ['lead-analytics'] });
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
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

export const useOptimisticStatusUpdate = () => {
  const queryClient = useQueryClient();
  const { updateLead } = useLeadService();
  const { showSuccess, showError, showLoading, dismiss } = useNotifications();

  return useMutation({
    mutationFn: async ({ leadId, status, notes }: { 
      leadId: string; 
      status: Lead['status']; 
      notes?: string; 
    }) => {
      console.log('Optimistic status update:', { leadId, status, notes });

      // Show loading notification
      const loadingToast = showLoading(`Updating lead status to ${status}...`);

      try {
        // Optimistic update to the cache
        queryClient.setQueryData(['leads'], (oldData: Lead[] | undefined) => {
          if (!oldData) return oldData;
          
          return oldData.map(lead => 
            lead.id === leadId 
              ? { ...lead, status, updated_at: new Date().toISOString() }
              : lead
          );
        });

        // Perform the actual update
        const result = await updateLead(leadId, { status, notes });
        
        dismiss(loadingToast);
        
        if (!result) {
          throw new Error('Update failed - service returned null');
        }

        showSuccess(`Lead status updated to ${status}`, {
          description: 'The lead has been successfully updated.',
        });

        return result;
      } catch (error) {
        dismiss(loadingToast);
        
        // Revert optimistic update on error
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        
        console.error('Status update failed:', error);
        showError('Failed to update lead status', {
          description: error instanceof Error ? error.message : 'Please try again or contact support.',
        });
        
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-analytics'] });
    },
  });
};

export const useBulkLeadActions = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError, showLoading, dismiss } = useNotifications();

  const bulkStatusUpdate = useMutation({
    mutationFn: async ({ leadIds, status, notes }: {
      leadIds: string[];
      status: Lead['status'];
      notes?: string;
    }) => {
      const loadingToast = showLoading(`Updating ${leadIds.length} leads...`);
      
      try {
        const results = await Promise.allSettled(
          leadIds.map(async (leadId) => {
            const result = await LeadService.updateLead(leadId, { status, notes });
            if (!result.success) {
              throw new Error(`Failed to update lead ${leadId}: ${result.error}`);
            }
            return result.data;
          })
        );

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        dismiss(loadingToast);

        if (failed === 0) {
          showSuccess(`Successfully updated ${successful} leads`);
        } else if (successful > 0) {
          showError(`Updated ${successful} leads, ${failed} failed`, {
            description: 'Some leads could not be updated. Please try again.',
          });
        } else {
          showError('Failed to update any leads', {
            description: 'Please check the leads and try again.',
          });
        }

        return { successful, failed, results };
      } catch (error) {
        dismiss(loadingToast);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const bulkAssignment = useMutation({
    mutationFn: async ({ leadIds, adminId }: {
      leadIds: string[];
      adminId: string;
    }) => {
      const loadingToast = showLoading(`Assigning ${leadIds.length} leads...`);
      
      try {
        const results = await Promise.allSettled(
          leadIds.map(async (leadId) => {
            const result = await LeadService.assignLead({
              leadId,
              adminId,
              reason: 'Bulk assignment'
            });
            if (!result.success) {
              throw new Error(`Failed to assign lead ${leadId}: ${result.error}`);
            }
            return result.data;
          })
        );

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        dismiss(loadingToast);

        if (failed === 0) {
          showSuccess(`Successfully assigned ${successful} leads`);
        } else {
          showError(`Assigned ${successful} leads, ${failed} failed`);
        }

        return { successful, failed, results };
      } catch (error) {
        dismiss(loadingToast);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  return {
    bulkStatusUpdate,
    bulkAssignment,
  };
};

export const useLeadAnalytics = () => {
  return useQuery({
    queryKey: ['lead-analytics'],
    queryFn: async () => {
      // Use consistent field selection matching the updated service
      const { data: leads, error } = await supabase
        .from('leads')
        .select('status, created_at, converted_at, qualification_score, priority, source');

      if (error) throw error;

      // Calculate analytics
      const totalLeads = leads?.length || 0;
      const statusCounts = leads?.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const conversionRate = totalLeads > 0 
        ? ((statusCounts['converted'] || 0) / totalLeads * 100).toFixed(2)
        : '0';

      const averageScore = leads?.length 
        ? (leads.reduce((sum, lead) => sum + (lead.qualification_score || 0), 0) / leads.length).toFixed(1)
        : '0';

      const sourceDistribution = leads?.reduce((acc, lead) => {
        if (lead.source) {
          acc[lead.source] = (acc[lead.source] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>) || {};

      return {
        totalLeads,
        statusCounts,
        conversionRate: parseFloat(conversionRate),
        averageScore: parseFloat(averageScore),
        sourceDistribution,
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });
};
