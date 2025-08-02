
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
      
      // Transform the data to match our LeadActivity type
      const activities = data?.map((activity) => {
        // Type guard to check if created_by_user is a valid user object
        const hasValidUser = activity.created_by_user && 
          typeof activity.created_by_user === 'object' && 
          !Array.isArray(activity.created_by_user) &&
          'full_name' in activity.created_by_user &&
          'email' in activity.created_by_user;

        return {
          ...activity,
          created_by_user: hasValidUser ? {
            full_name: (activity.created_by_user as any).full_name || '',
            email: (activity.created_by_user as any).email || ''
          } : null
        };
      }) || [];

      return activities as LeadActivity[];
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
