
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tenant } from '@/types/tenant';
import { TenantMetrics } from '@/types/tenantView';

export const useTenantAnalytics = ({ 
  tenants = [], 
  autoRefresh = false, 
  refreshInterval = 30000 
}) => {
  const [tenantMetrics, setTenantMetrics] = useState<Record<string, TenantMetrics>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  
  // Use refs to prevent duplicate requests
  const requestsInProgress = useRef<Set<string>>(new Set());
  const lastFetchTime = useRef<Record<string, number>>({});
  const lastTenantIds = useRef<string>(''); // Move this to top level

  const fetchMetrics = useCallback(async (tenantId: string) => {
    if (!tenantId) return null;
    
    // Prevent duplicate requests for the same tenant
    if (requestsInProgress.current.has(tenantId)) {
      console.log('useTenantAnalytics: Request already in progress for tenant:', tenantId);
      return null;
    }

    // Throttle requests - don't fetch more than once per 5 seconds per tenant
    const now = Date.now();
    const lastFetch = lastFetchTime.current[tenantId] || 0;
    if (now - lastFetch < 5000) {
      console.log('useTenantAnalytics: Throttling request for tenant:', tenantId);
      return null;
    }

    requestsInProgress.current.add(tenantId);
    lastFetchTime.current[tenantId] = now;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('useTenantAnalytics: Fetching metrics for tenant:', tenantId);
      
      // Call edge function with tenant_id as query parameter
      const { data, error: fetchError } = await supabase.functions.invoke(
        `tenant-real-time-metrics?tenant_id=${tenantId}`,
        {
          method: 'GET'
        }
      );
      
      if (fetchError) {
        console.error('useTenantAnalytics: Error fetching metrics:', fetchError);
        setError(fetchError);
        return null;
      }

      console.log('useTenantAnalytics: Metrics data received:', data);
      
      // Transform the data to match the TenantMetrics interface
      // Map from edge function response structure to frontend interface
      const transformedMetrics: TenantMetrics = {
        usageMetrics: {
          farmers: { 
            current: data?.capacity_status?.farmers_usage?.current || data?.usage?.farmers || 0, 
            limit: data?.capacity_status?.farmers_usage?.limit || data?.limits?.farmers || 1000,
            percentage: data?.capacity_status?.farmers_usage?.percentage || 0
          },
          dealers: { 
            current: data?.capacity_status?.dealers_usage?.current || data?.usage?.dealers || 0, 
            limit: data?.capacity_status?.dealers_usage?.limit || data?.limits?.dealers || 500,
            percentage: data?.capacity_status?.dealers_usage?.percentage || 0
          },
          products: { 
            current: data?.usage?.products || 0, 
            limit: data?.limits?.products || 10000,
            percentage: data?.usage?.products && data?.limits?.products 
              ? (data.usage.products / data.limits.products) * 100 
              : 0
          },
          storage: { 
            current: data?.capacity_status?.storage_usage?.current || data?.usage?.storage || 0, 
            limit: data?.capacity_status?.storage_usage?.limit || data?.limits?.storage || 100,
            percentage: data?.capacity_status?.storage_usage?.percentage || 0
          },
          apiCalls: { 
            current: data?.capacity_status?.api_usage?.current || data?.usage?.api_calls || 0, 
            limit: data?.capacity_status?.api_usage?.limit || data?.limits?.api_calls || 100000,
            percentage: data?.capacity_status?.api_usage?.percentage || 0
          }
        },
        growthTrends: {
          farmers: data?.trends?.farmers || [],
          revenue: data?.trends?.revenue || [],
          apiUsage: data?.trends?.apiUsage || []
        },
        healthScore: data?.health_score || 85,
        lastActivityDate: data?.last_activity || new Date().toISOString()
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
      requestsInProgress.current.delete(tenantId);
    }
  }, []);

  const refreshMetrics = useCallback(() => {
    if (tenants.length > 0) {
      // Clear throttling for manual refresh
      lastFetchTime.current = {};
      
      // Fetch metrics for all tenants with a small delay between each
      tenants.forEach((tenant, index) => {
        if (tenant?.id) {
          setTimeout(() => {
            fetchMetrics(tenant.id);
          }, index * 100); // Stagger requests by 100ms
        }
      });
    }
  }, [tenants, fetchMetrics]);

  useEffect(() => {
    // Only fetch on initial load or when tenants change significantly
    if (tenants.length > 0) {
      const currentTenantIds = tenants.map(t => t.id).sort().join(',');
      
      if (lastTenantIds.current !== currentTenantIds) {
        lastTenantIds.current = currentTenantIds;
        refreshMetrics();
      }
    }
  }, [tenants.length, refreshMetrics]); // Added refreshMetrics to dependencies

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshMetrics();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshMetrics]);

  return {
    tenantMetrics,
    isLoading,
    error,
    refreshMetrics,
    fetchMetrics
  };
};
