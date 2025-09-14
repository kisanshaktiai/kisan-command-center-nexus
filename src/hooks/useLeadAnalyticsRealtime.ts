
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useLeadAnalyticsRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('Setting up lead analytics real-time subscriptions...');
    
    const channel = supabase
      .channel('lead-analytics-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'leads'
      }, (payload) => {
        console.log('Lead change detected:', payload);
        // Invalidate all lead analytics queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['lead-analytics'] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lead_activities'
      }, (payload) => {
        console.log('Lead activity change detected:', payload);
        // Invalidate lead analytics queries when activities change
        queryClient.invalidateQueries({ queryKey: ['lead-analytics'] });
      })
      .subscribe();

    return () => {
      console.log('Cleaning up lead analytics real-time subscriptions...');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
