
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TenantMetrics } from '@/types/tenantView';
import { Tenant } from '@/types/tenant';

interface UseTenantAnalyticsOptions {
  tenants: Tenant[];
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useTenantAnalytics = ({ 
  tenants, 
  autoRefresh = true, 
  refreshInterval = 30000 
}: UseTenantAnalyticsOptions) => {
  const [tenantMetrics, setTenantMetrics] = useState<Record<string, TenantMetrics>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTenantMetrics = useCallback(async (tenantId: string): Promise<TenantMetrics | null> => {
    try {
      // Use the configured Supabase URL and key from the client
      const SUPABASE_URL = "https://qfklkkzxemsbeniyugiz.supabase.co";
      const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFma2xra3p4ZW1zYmVuaXl1Z2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MjcxNjUsImV4cCI6MjA2ODAwMzE2NX0.dUnGp7wbwYom1FPbn_4EGf3PWjgmr8mXwL2w2SdYOh4";
      
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/tenant-real-time-metrics?tenant_id=${tenantId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
          }
        }
      );

      if (!response.ok) {
        console.error(`Error fetching metrics for tenant ${tenantId}:`, response.status, response.statusText);
        return null;
      }

      const data = await response.json();

      if (!data) return null;

      return {
        usageMetrics: {
          farmers: {
            current: data.capacity_status?.farmers_usage?.current || 0,
            limit: data.capacity_status?.farmers_usage?.limit || 1000,
            percentage: data.capacity_status?.farmers_usage?.percentage || 0
          },
          dealers: {
            current: data.capacity_status?.dealers_usage?.current || 0,
            limit: data.capacity_status?.dealers_usage?.limit || 50,
            percentage: data.capacity_status?.dealers_usage?.percentage || 0
          },
          products: {
            current: data.usage?.products || 0,
            limit: data.limits?.products || 100,
            percentage: data.usage?.products ? (data.usage.products / (data.limits?.products || 100)) * 100 : 0
          },
          storage: {
            current: data.capacity_status?.storage_usage?.current || 0,
            limit: data.capacity_status?.storage_usage?.limit || 10,
            percentage: data.capacity_status?.storage_usage?.percentage || 0
          },
          apiCalls: {
            current: data.capacity_status?.api_usage?.current || 0,
            limit: data.capacity_status?.api_usage?.limit || 10000,
            percentage: data.capacity_status?.api_usage?.percentage || 0
          }
        },
        growthTrends: {
          farmers: data.trends?.farmers || [10, 15, 25, 30, 45, 50, 65],
          revenue: data.trends?.revenue || [1000, 1200, 1500, 1800, 2100, 2400, 2700],
          apiUsage: data.trends?.apiUsage || [100, 150, 200, 250, 300, 350, 400]
        },
        healthScore: data.health_score || Math.floor(Math.random() * 40) + 60,
        lastActivityDate: data.last_activity || new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error fetching metrics for tenant ${tenantId}:`, error);
      return null;
    }
  }, []);

  const fetchAllMetrics = useCallback(async () => {
    if (tenants.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const metricsPromises = tenants.map(tenant => 
        fetchTenantMetrics(tenant.id).then(metrics => ({ tenantId: tenant.id, metrics }))
      );

      const results = await Promise.all(metricsPromises);
      const newMetrics: Record<string, TenantMetrics> = {};

      results.forEach(result => {
        if (result.metrics) {
          newMetrics[result.tenantId] = result.metrics;
        }
      });

      setTenantMetrics(newMetrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setIsLoading(false);
    }
  }, [tenants, fetchTenantMetrics]);

  const refreshMetrics = useCallback(() => {
    fetchAllMetrics();
  }, [fetchAllMetrics]);

  // Initial fetch
  useEffect(() => {
    fetchAllMetrics();
  }, [fetchAllMetrics]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || tenants.length === 0) return;

    const interval = setInterval(fetchAllMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchAllMetrics, tenants.length]);

  return {
    tenantMetrics,
    isLoading,
    error,
    refreshMetrics,
    fetchTenantMetrics
  };
};
