
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
      
      // Fix the API call to use proper headers instead of body for GET request
      const { data, error: fetchError } = await supabase.functions.invoke(
        'tenant-real-time-metrics',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': tenantId
          }
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
      const lastTenantIds = useRef('');
      
      if (lastTenantIds.current !== currentTenantIds) {
        lastTenantIds.current = currentTenantIds;
        refreshMetrics();
      }
    }
  }, [tenants.length]); // Only depend on tenant count, not the full tenants array

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
