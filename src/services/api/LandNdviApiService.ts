import { supabase } from '@/integrations/supabase/client';

export interface ProcessLandsNdviParams {
  tenantId: string;
  landIds?: string[];
  urgent?: boolean;
}

export interface LandNdviResult {
  land_id: string;
  ndvi_mean: number;
  ndvi_min: number;
  ndvi_max: number;
  ndvi_stddev: number;
  acquisition_date: string;
  cloud_coverage: number;
}

export interface ProcessLandsNdviResponse {
  success: boolean;
  data?: {
    total_clusters: number;
    processed_lands: number;
    results: LandNdviResult[];
    errors: Array<{ cluster_id: number; error: string }>;
  };
  error?: string;
  message?: string;
}

export interface ApiCostSummary {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  total_cost_usd: number;
  total_processing_units: number;
  total_data_mb: number;
  avg_response_time_ms: number;
  calls_by_type: Record<string, { count: number; cost: number }>;
}

export class LandNdviApiService {
  /**
   * Process NDVI for lands using the land-first clustering approach
   */
  static async processLandsNdvi(params: ProcessLandsNdviParams): Promise<ProcessLandsNdviResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('process-ndvi-by-lands', {
        body: params,
      });

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('[LandNdviApiService] processLandsNdvi error:', error);
      return {
        success: false,
        error: error.message || 'Failed to process lands NDVI',
      };
    }
  }

  /**
   * Get API cost summary for a tenant
   */
  static async getTenantApiCosts(
    tenantId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ApiCostSummary | null> {
    try {
      const { data, error } = await supabase.rpc('get_tenant_api_costs', {
        p_tenant_id: tenantId,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;
      const result = data?.[0];
      if (!result) return null;

      return {
        ...result,
        calls_by_type: (result.calls_by_type || {}) as Record<string, { count: number; cost: number }>,
      };
    } catch (error: any) {
      console.error('[LandNdviApiService] getTenantApiCosts error:', error);
      return null;
    }
  }

  /**
   * Get land clusters for a tenant
   */
  static async getLandClusters(tenantId: string) {
    try {
      const { data, error } = await supabase
        .from('land_clusters')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('last_processed_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('[LandNdviApiService] getLandClusters error:', error);
      return [];
    }
  }

  /**
   * Get recent API calls for a tenant
   */
  static async getRecentApiCalls(tenantId: string, limit: number = 50) {
    try {
      const { data, error } = await supabase
        .from('copernicus_api_calls')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('[LandNdviApiService] getRecentApiCalls error:', error);
      return [];
    }
  }
}

export const landNdviApiService = new LandNdviApiService();
