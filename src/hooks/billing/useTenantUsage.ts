
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TenantLimit, TenantUsageTracking } from '@/types/subscription';

interface TenantUsageData {
  limits: TenantLimit[];
  usage_tracking: TenantUsageTracking[];
  usage_summary: {
    [key: string]: {
      current: number;
      limit: number;
      percentage: number;
    };
  };
}

export const useTenantUsage = (tenantId?: string) => {
  return useQuery({
    queryKey: ['tenant-usage', tenantId],
    queryFn: async (): Promise<TenantUsageData> => {
      if (!tenantId) {
        throw new Error('Tenant ID is required');
      }

      // Get tenant limits
      const { data: limits, error: limitsError } = await supabase
        .from('tenant_limits')
        .select('*')
        .eq('tenant_id', tenantId);

      if (limitsError) throw limitsError;

      // Get usage tracking for current month
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      
      const { data: usage, error: usageError } = await supabase
        .from('tenant_usage_tracking')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('usage_date', `${currentMonth}-01`)
        .order('usage_date', { ascending: false });

      if (usageError) throw usageError;

      // Calculate usage summary
      const usageSummary: { [key: string]: { current: number; limit: number; percentage: number } } = {};
      
      limits?.forEach(limit => {
        const current = limit.current_usage || 0;
        const max = limit.limit_value || 0;
        const percentage = max > 0 ? (current / max) * 100 : 0;
        
        usageSummary[limit.limit_type] = {
          current,
          limit: max,
          percentage: Math.min(percentage, 100)
        };
      });

      return {
        limits: limits || [],
        usage_tracking: usage || [],
        usage_summary: usageSummary,
      };
    },
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};
