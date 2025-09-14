
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsRequest {
  type: 'conversion_funnel' | 'lead_performance' | 'source_effectiveness' | 'team_performance';
  dateRange?: {
    start: string;
    end: string;
  };
  filters?: any;
}

export const useLeadAnalytics = (request: AnalyticsRequest) => {
  return useQuery({
    queryKey: ['lead-analytics', request.type, request.dateRange, request.filters],
    queryFn: async () => {
      console.log('Fetching lead analytics:', request);
      
      const { data, error } = await supabase.functions.invoke('lead-analytics', {
        body: request,
      });

      if (error) {
        console.error('Lead analytics error:', error);
        throw new Error(error.message || 'Failed to fetch analytics data');
      }
      
      console.log('Lead analytics response:', data);
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for real-time feel
    retry: (failureCount, error) => {
      // Don't retry on specific errors
      if (error?.message?.includes('permission') || error?.message?.includes('not found')) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

export const useConversionFunnel = (dateRange?: { start: string; end: string }) => {
  return useLeadAnalytics({ type: 'conversion_funnel', dateRange });
};

export const useLeadPerformance = (dateRange?: { start: string; end: string }, filters?: any) => {
  return useLeadAnalytics({ type: 'lead_performance', dateRange, filters });
};

export const useSourceEffectiveness = (dateRange?: { start: string; end: string }) => {
  return useLeadAnalytics({ type: 'source_effectiveness', dateRange });
};

export const useTeamPerformance = (dateRange?: { start: string; end: string }) => {
  return useLeadAnalytics({ type: 'team_performance', dateRange });
};
