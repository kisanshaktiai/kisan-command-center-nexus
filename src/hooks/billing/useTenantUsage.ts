
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TenantUsageData {
  limits: any[];
  usage_tracking: any[];
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

      // For now, return mock data until the new usage tables are properly integrated
      // This allows the UI to render without errors while the database schema is being updated

      // Instead of querying non-existent tables, we'll use mock data based on tenant subscription
      let usageSummary: { [key: string]: { current: number; limit: number; percentage: number } };

      try {
        // Try to get tenant info to determine plan type
        const { data: tenant } = await supabase
          .from('tenants')
          .select('subscription_plan, metadata')
          .eq('id', tenantId)
          .single();

        // Generate realistic usage data based on subscription plan
        if (tenant?.subscription_plan === 'AI_Enterprise') {
          usageSummary = {
            farmers: { current: 850, limit: 20000, percentage: 4.25 },
            dealers: { current: 120, limit: 1000, percentage: 12 },
            products: { current: 450, limit: 2000, percentage: 22.5 },
            storage_gb: { current: 85.5, limit: 200, percentage: 42.75 },
            api_calls_per_day: { current: 15000, limit: 200000, percentage: 7.5 }
          };
        } else if (tenant?.subscription_plan === 'Shakti_Growth') {
          usageSummary = {
            farmers: { current: 320, limit: 5000, percentage: 6.4 },
            dealers: { current: 45, limit: 200, percentage: 22.5 },
            products: { current: 180, limit: 500, percentage: 36 },
            storage_gb: { current: 22.1, limit: 50, percentage: 44.2 },
            api_calls_per_day: { current: 8500, limit: 50000, percentage: 17 }
          };
        } else {
          // Default to Kisan_Basic
          usageSummary = {
            farmers: { current: 45, limit: 1000, percentage: 4.5 },
            dealers: { current: 12, limit: 50, percentage: 24 },
            products: { current: 78, limit: 100, percentage: 78 },
            storage_gb: { current: 5.2, limit: 10, percentage: 52 },
            api_calls_per_day: { current: 850, limit: 10000, percentage: 8.5 }
          };
        }
      } catch (error) {
        console.log('useTenantUsage: Using fallback data due to:', error);
        // Fallback to basic plan limits
        usageSummary = {
          farmers: { current: 45, limit: 1000, percentage: 4.5 },
          dealers: { current: 12, limit: 50, percentage: 24 },
          products: { current: 78, limit: 100, percentage: 78 },
          storage_gb: { current: 5.2, limit: 10, percentage: 52 },
          api_calls_per_day: { current: 850, limit: 10000, percentage: 8.5 }
        };
      }

      return {
        limits: [],
        usage_tracking: [],
        usage_summary: usageSummary,
      };
    },
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};
