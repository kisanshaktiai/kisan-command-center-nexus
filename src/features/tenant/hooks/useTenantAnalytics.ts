
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tenant } from '@/types/tenant';
import { TenantMetrics } from '@/types/tenantView'; // Use centralized type

export const useTenantAnalytics = ({ 
  tenants = [], 
  autoRefresh = false, 
  refreshInterval = 30000 
}) => {
  // Use the centralized TenantMetrics type
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
      
      // Transform the data to match the TenantMetrics interface
      const transformedMetrics: TenantMetrics = {
        usageMetrics: {
          farmers: { 
            current: data?.usageMetrics?.farmers?.current || 0, 
            limit: data?.usageMetrics?.farmers?.limit || 1000,
            percentage: data?.usageMetrics?.farmers?.percentage || 0
          },
          dealers: { 
            current: data?.usageMetrics?.dealers?.current || 0, 
            limit: data?.usageMetrics?.dealers?.limit || 500,
            percentage: data?.usageMetrics?.dealers?.percentage || 0
          },
          products: { 
            current: data?.usageMetrics?.products?.current || 0, 
            limit: data?.usageMetrics?.products?.limit || 10000,
            percentage: data?.usageMetrics?.products?.percentage || 0
          },
          storage: { 
            current: data?.usageMetrics?.storage?.current || 0, 
            limit: data?.usageMetrics?.storage?.limit || 100,
            percentage: data?.usageMetrics?.storage?.percentage || 0
          },
          apiCalls: { 
            current: data?.usageMetrics?.apiCalls?.current || 0, 
            limit: data?.usageMetrics?.apiCalls?.limit || 100000,
            percentage: data?.usageMetrics?.apiCalls?.percentage || 0
          }
        },
        growthTrends: {
          farmers: data?.growthTrends?.farmers || [],
          revenue: data?.growthTrends?.revenue || [],
          apiUsage: data?.growthTrends?.apiUsage || []
        },
        healthScore: data?.healthScore || 85,
        lastActivityDate: data?.lastActivityDate || new Date().toISOString()
      };
      
      // Update the metrics for this specific tenant
      setTenantMetrics(prev => ({
        ...prev,
        [tenantId]: transformedMetrics
      }));
      
      return transformedMetrics;
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
    tenantMetrics, // Now correctly typed as Record<string, TenantMetrics> using centralized type
    isLoading,
    error,
    refreshMetrics,
    fetchMetrics
  };
};
