
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tenant } from '@/types/tenant';

export interface TenantMetrics {
  usageMetrics: {
    farmers: { current: number; limit: number };
    dealers: { current: number; limit: number };
    storage: { current: number; limit: number };
    apiCalls: { current: number; limit: number };
  };
  growthTrends: {
    farmers: number[];
    revenue: number[];
    apiUsage: number[];
  };
  healthScore: number;
}

export const useTenantAnalytics = ({ 
  tenants = [], 
  autoRefresh = false, 
  refreshInterval = 30000 
}) => {
  // Change to Record<string, TenantMetrics> to match expected interface
  const [tenantMetrics, setTenantMetrics] = useState<Record<string, TenantMetrics>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const fetchMetrics = useCallback(async (tenantId: string) => {
    if (!tenantId) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('useTenantAnalytics: Fetching metrics for tenant:', tenantId);
      
      const { data, error: fetchError } = await supabase.functions.invoke(
        'tenant-real-time-metrics',
        {
          method: 'GET',
          body: JSON.stringify({ tenant_id: tenantId })
        }
      );
      
      if (fetchError) {
        console.error('useTenantAnalytics: Error fetching metrics:', fetchError);
        setError(fetchError);
        return null;
      }

      console.log('useTenantAnalytics: Metrics data received:', data);
      
      // Update the metrics for this specific tenant
      setTenantMetrics(prev => ({
        ...prev,
        [tenantId]: data
      }));
      
      return data;
    } catch (err) {
      console.error('useTenantAnalytics: Unexpected error:', err);
      setError(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshMetrics = useCallback(() => {
    if (tenants.length > 0) {
      // Fetch metrics for all tenants, not just the first one
      tenants.forEach(tenant => {
        if (tenant?.id) {
          fetchMetrics(tenant.id);
        }
      });
    }
  }, [tenants, fetchMetrics]);

  useEffect(() => {
    refreshMetrics();
  }, [refreshMetrics]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refreshMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshMetrics]);

  return {
    tenantMetrics, // Now correctly typed as Record<string, TenantMetrics>
    isLoading,
    error,
    refreshMetrics,
    fetchMetrics
  };
};
