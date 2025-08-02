
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import type { LeadActivity } from '@/types/leads';

export const useLeadActivities = (leadId: string) => {
  const queryClient = useQueryClient();

  // Set up real-time subscription for activities
  useEffect(() => {
    if (!leadId) return;

    const channel = supabase
      .channel(`lead-activities-${leadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_activities',
          filter: `lead_id=eq.${leadId}`,
        },
        (payload) => {
          console.log('Real-time activity update:', payload);
          queryClient.invalidateQueries({ queryKey: ['lead-activities', leadId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, queryClient]);

  return useQuery({
    queryKey: ['lead-activities', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_activities')
        .select(`
          *,
          created_by_user:admin_users!created_by(full_name, email)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LeadActivity[];
    },
    enabled: !!leadId,
  });
};

export const useCreateLeadActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activity: Omit<LeadActivity, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('lead_activities')
        .insert({
          ...activity,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lead-activities', data.lead_id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
};
