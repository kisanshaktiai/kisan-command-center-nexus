
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import type { LeadTag } from '@/types/leads';

export const useLeadTags = (leadId?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!leadId) return;

    const channel = supabase
      .channel(`lead-tags-${leadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_tags',
          filter: `lead_id=eq.${leadId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['lead-tags', leadId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, queryClient]);

  return useQuery({
    queryKey: ['lead-tags', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_tags')
        .select('*')
        .eq('lead_id', leadId!)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as LeadTag[];
    },
    enabled: !!leadId,
  });
};

export const useAllLeadTags = () => {
  return useQuery({
    queryKey: ['all-lead-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_tags')
        .select('tag_name, tag_color')
        .order('tag_name');

      if (error) throw error;
      
      // Get unique tags
      const uniqueTags = Array.from(
        new Map(data.map(tag => [tag.tag_name, tag])).values()
      );
      
      return uniqueTags;
    },
  });
};

export const useCreateLeadTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tag: Omit<LeadTag, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('lead_tags')
        .insert({
          ...tag,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lead-tags', data.lead_id] });
      queryClient.invalidateQueries({ queryKey: ['all-lead-tags'] });
    },
  });
};

export const useDeleteLeadTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from('lead_tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-tags'] });
      queryClient.invalidateQueries({ queryKey: ['all-lead-tags'] });
    },
  });
};
