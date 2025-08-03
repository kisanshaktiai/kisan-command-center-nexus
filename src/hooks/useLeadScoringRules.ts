
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import type { LeadScoringRule } from '@/types/leads';

export const useLeadScoringRules = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('lead-scoring-rules-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_scoring_rules',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['lead-scoring-rules'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['lead-scoring-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_scoring_rules')
        .select('*')
        .order('score_value', { ascending: false });

      if (error) throw error;
      return data as LeadScoringRule[];
    },
  });
};

export const useCreateScoringRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rule: Omit<LeadScoringRule, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('lead_scoring_rules')
        .insert(rule)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-scoring-rules'] });
    },
  });
};

export const useUpdateScoringRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<LeadScoringRule> }) => {
      const { data, error } = await supabase
        .from('lead_scoring_rules')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-scoring-rules'] });
    },
  });
};

export const useDeleteScoringRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lead_scoring_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-scoring-rules'] });
    },
  });
};
