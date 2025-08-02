
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from './useNotifications';

interface LeadProcessingRequest {
  action: 'auto_assign' | 'calculate_score' | 'detect_duplicates' | 'enrich_data';
  leadId?: string;
  leadData?: any;
}

export const useLeadProcessor = () => {
  const { showSuccess, showError } = useNotifications();

  return useMutation({
    mutationFn: async (request: LeadProcessingRequest) => {
      const { data, error } = await supabase.functions.invoke('lead-processor', {
        body: request,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      switch (variables.action) {
        case 'auto_assign':
          showSuccess('Lead auto-assigned successfully');
          break;
        case 'calculate_score':
          showSuccess(`Lead score calculated: ${data.score}`);
          break;
        case 'detect_duplicates':
          if (data.count > 0) {
            showSuccess(`Found ${data.count} potential duplicates`);
          } else {
            showSuccess('No duplicates found');
          }
          break;
        case 'enrich_data':
          showSuccess('Lead data enriched successfully');
          break;
      }
    },
    onError: (error: any) => {
      showError('Lead processing failed', { description: error.message });
    },
  });
};
