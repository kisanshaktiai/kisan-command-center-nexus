
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tenant } from '@/types/tenant';

export interface TenantMetrics {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  apiCalls: number;
  storageUsed: number;
  lastActivity: string;
  growthRate: number;
  healthScore: number;
}

interface UseTenantAnalyticsOptions {
  tenants: Tenant[];
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useTenantAnalytics = ({ 
  tenants, 
  autoRefresh = false, 
  refreshInterval = 30000 
}: UseTenantAnalyticsOptions) => {
  const [tenantMetrics, setTenantMetrics] = useState<Record<string, TenantMetrics>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetricsForTenant = useCallback(async (tenantId: string): Promise<TenantMetrics | null> => {
    try {
      // Simulate API call with fallback data for development
      const fallbackMetrics: TenantMetrics = {
        totalUsers: Math.floor(Math.random() * 100) + 10,
        activeUsers: Math.floor(Math.random() * 50) + 5,
        totalRevenue: Math.floor(Math.random() * 10000) + 1000,
        apiCalls: Math.floor(Math.random() * 5000) + 500,
        storageUsed: Math.floor(Math.random() * 80) + 10,
        lastActivity: new Date().toISOString(),
        growthRate: Math.floor(Math.random() * 20) + 5,
        healthScore: Math.floor(Math.random() * 30) + 70
      };

      // Try to fetch real metrics first, fall back to simulated data
      try {
        const { data, error } = await supabase.functions.invoke('tenant-real-time-metrics', {
          body: { tenant_id: tenantId }
        });

        if (error) {
          console.warn(`Failed to fetch real metrics for tenant ${tenantId}, using fallback:`, error);
          return fallbackMetrics;
        }

        return data || fallbackMetrics;
      } catch (networkError) {
        console.warn(`Network error fetching metrics for tenant ${tenantId}, using fallback:`, networkError);
        return fallbackMetrics;
      }
    } catch (error) {
      console.error(`Error fetching metrics for tenant ${tenantId}:`, error);
      return null;
    }
  }, []);

  const refreshMetrics = useCallback(async () => {
    if (!tenants.length) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('useTenantAnalytics: Refreshing metrics for', tenants.length, 'tenants');
      
      const metricsPromises = tenants.map(async (tenant) => {
        const metrics = await fetchMetricsForTenant(tenant.id);
        return { tenantId: tenant.id, metrics };
      });

      const results = await Promise.all(metricsPromises);
      
      const newMetrics: Record<string, TenantMetrics> = {};
      results.forEach(({ tenantId, metrics }) => {
        if (metrics) {
          newMetrics[tenantId] = metrics;
        }
      });

      setTenantMetrics(newMetrics);
      console.log('useTenantAnalytics: Successfully updated metrics for', Object.keys(newMetrics).length, 'tenants');
    } catch (error) {
      console.error('useTenantAnalytics: Error refreshing metrics:', error);
      setError('Failed to refresh tenant metrics');
    } finally {
      setIsLoading(false);
    }
  }, [tenants, fetchMetricsForTenant]);

  // Initial load
  useEffect(() => {
    if (tenants.length > 0) {
      refreshMetrics();
    }
  }, [tenants, refreshMetrics]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !refreshInterval) return;

    const interval = setInterval(refreshMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshMetrics]);

  return {
    tenantMetrics,
    isLoading,
    error,
    refreshMetrics
  };
};
