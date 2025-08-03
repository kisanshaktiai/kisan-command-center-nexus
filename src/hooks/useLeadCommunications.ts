
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import type { LeadCommunicationLog } from '@/types/leads';

export const useLeadCommunications = (leadId: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!leadId) return;

    const channel = supabase
      .channel(`lead-communications-${leadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_communication_logs',
          filter: `lead_id=eq.${leadId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['lead-communications', leadId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, queryClient]);

  return useQuery({
    queryKey: ['lead-communications', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_communication_logs')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      return data as LeadCommunicationLog[];
    },
    enabled: !!leadId,
  });
};

export const useCreateLeadCommunication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (communication: Omit<LeadCommunicationLog, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('lead_communication_logs')
        .insert({
          ...communication,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lead-communications', data.lead_id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
};
