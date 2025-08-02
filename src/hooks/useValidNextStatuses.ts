
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Lead } from '@/types/leads';

export const useValidNextStatuses = (currentStatus: Lead['status']) => {
  return useQuery({
    queryKey: ['valid-next-statuses', currentStatus],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_valid_next_statuses', {
        current_status: currentStatus
      });

      if (error) throw error;
      return data as string[];
    },
    enabled: !!currentStatus,
  });
};
