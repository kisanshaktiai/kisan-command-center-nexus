import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TenantMetrics } from '@/types/tenantView';
import { Tenant } from '@/types/tenant';
import { useNotifications } from '@/hooks/useNotifications';

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
  const [retryCount, setRetryCount] = useState<Record<string, number>>({});
  const [errorMessages, setErrorMessages] = useState<Record<string, string>>({});
  const { showError } = useNotifications();

  const fetchTenantMetrics = useCallback(async (tenantId: string): Promise<TenantMetrics | null> => {
    try {
      console.log(`Fetching metrics for tenant: ${tenantId}`);
      
      // Send tenant_id directly in JSON body format
      const { data, error } = await supabase.functions.invoke('tenant-real-time-metrics', {
        body: { tenant_id: tenantId }
      });

      if (error) {
        console.error(`Error fetching metrics for tenant ${tenantId}:`, error);
        
        // Store specific error message for this tenant
        setErrorMessages(prev => ({
          ...prev,
          [tenantId]: error.message || 'Failed to fetch metrics'
        }));
        
        // Increment retry count for this tenant
        setRetryCount(prev => ({
          ...prev,
          [tenantId]: (prev[tenantId] || 0) + 1
        }));
        
        return null;
      }

      if (!data) {
        console.warn(`No data received for tenant ${tenantId}`);
        setErrorMessages(prev => ({
          ...prev,
          [tenantId]: 'No data received from server'
        }));
        return null;
      }

      // Clear error message for successful fetch
      setErrorMessages(prev => {
        const { [tenantId]: _, ...rest } = prev;
        return rest;
      });

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
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch metrics';
      setErrorMessages(prev => ({
        ...prev,
        [tenantId]: errorMessage
      }));
      
      // Increment retry count for this tenant
      setRetryCount(prev => ({
        ...prev,
        [tenantId]: (prev[tenantId] || 0) + 1
      }));
      
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
      let failedCount = 0;

      results.forEach(result => {
        if (result.metrics) {
          newMetrics[result.tenantId] = result.metrics;
        } else {
          failedCount++;
        }
      });

      setTenantMetrics(newMetrics);

      if (failedCount > 0) {
        const errorMsg = `Failed to load metrics for ${failedCount} tenant${failedCount > 1 ? 's' : ''}`;
        setError(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch metrics';
      setError(errorMsg);
      showError('Failed to load tenant metrics', { description: errorMsg });
    } finally {
      setIsLoading(false);
    }
  }, [tenants, fetchTenantMetrics, showError]);

  const refreshMetrics = useCallback(() => {
    setRetryCount({}); // Reset retry counts
    setErrorMessages({}); // Reset error messages
    fetchAllMetrics();
  }, [fetchAllMetrics]);

  const retryTenantMetrics = useCallback((tenantId: string) => {
    fetchTenantMetrics(tenantId).then(metrics => {
      if (metrics) {
        setTenantMetrics(prev => ({
          ...prev,
          [tenantId]: metrics
        }));
        setRetryCount(prev => ({
          ...prev,
          [tenantId]: 0
        }));
      }
    });
  }, [fetchTenantMetrics]);

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
    retryCount,
    errorMessages,
    refreshMetrics,
    fetchTenantMetrics,
    retryTenantMetrics
  };
};
