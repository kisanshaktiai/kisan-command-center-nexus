import { supabase } from '@/integrations/supabase/client';

export interface LandNdviData {
  id: string;
  land_id: string;
  bbox: number[];
  acquisition_date: string;
  cloud_cover: number;
  ndvi_mean: number;
  ndvi_min: number;
  ndvi_max: number;
  ndvi_std_dev: number;
  ndvi_thumbnail_url?: string;
  statistics_only: boolean;
  expires_at: string;
  access_count: number;
  processing_units_used: number;
  resolution_meters: number;
  created_at: string;
}

export interface NdviRequestQueueItem {
  id: string;
  tenant_id: string;
  land_ids: string[];
  date_from: string;
  date_to: string;
  status: string;
  priority: number;
  scheduled_for: string;
}

class LandNdviService {
  /**
   * Fetch NDVI data for a specific land using tile-based caching
   * - Checks land cache first (ndvi_micro_tiles)
   * - Falls back to tile cache and clips to land (satellite_tiles)
   * - Only makes API call if no cache available
   * - Reduces API costs by 95%+
   */
  async fetchLandNdvi(landId: string, urgent: boolean = false, statisticsOnly: boolean = true) {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-land-ndvi', {
        body: { landId, urgent, statisticsOnly }
      });

      if (error) throw error;
      
      console.log('[landNdviService] Response:', {
        cached: data.cached,
        source: data.source,
        message: data.message
      });
      
      return { 
        success: true, 
        data: data.data,
        cached: data.cached || false,
        source: data.source || 'unknown',
        message: data.message
      };
    } catch (error: any) {
      console.error('[landNdviService] fetchLandNdvi error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get cached NDVI data for a land
  async getCachedNdvi(landId: string) {
    try {
      const { data, error } = await supabase
        .from('ndvi_micro_tiles')
        .select('*')
        .eq('land_id', landId)
        .gte('expires_at', new Date().toISOString())
        .order('acquisition_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('[landNdviService] getCachedNdvi error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get NDVI history for a land
  async getNdviHistory(landId: string, limit: number = 30) {
    try {
      const { data, error } = await supabase
        .from('ndvi_micro_tiles')
        .select('*')
        .eq('land_id', landId)
        .order('acquisition_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('[landNdviService] getNdviHistory error:', error);
      return { success: false, error: error.message };
    }
  }

  // Queue batch NDVI requests for multiple lands
  async queueBatchRequest(
    tenantId: string,
    landIds: string[],
    dateFrom: string,
    dateTo: string,
    priority: number = 5
  ) {
    try {
      const { data, error } = await supabase
        .from('ndvi_request_queue')
        .insert({
          tenant_id: tenantId,
          land_ids: landIds,
          tile_id: 'pending',
          date_from: dateFrom,
          date_to: dateTo,
          statistics_only: true,
          priority
        } as any)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('[landNdviService] queueBatchRequest error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get queue status
  async getQueueStatus(tenantId: string) {
    try {
      const { data, error } = await supabase
        .from('ndvi_request_queue')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('[landNdviService] getQueueStatus error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get API cost statistics
  async getApiCostStats(tenantId: string, startDate: string, endDate: string) {
    try {
      const { data, error } = await supabase
        .from('ndvi_micro_tiles')
        .select('processing_units_used, resolution_meters, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (error) throw error;

      const totalPU = data?.reduce((sum, item) => sum + (item.processing_units_used || 0), 0) || 0;
      const avgResolution = data?.length 
        ? data.reduce((sum, item) => sum + (item.resolution_meters || 0), 0) / data.length 
        : 0;

      return {
        success: true,
        data: {
          totalProcessingUnits: totalPU,
          totalRequests: data?.length || 0,
          avgResolution,
          estimatedCost: totalPU * 0.1 // $0.1 per PU estimate
        }
      };
    } catch (error: any) {
      console.error('[landNdviService] getApiCostStats error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process NDVI using land-first clustering approach
   */
  async processLandsNdvi(
    tenantId: string,
    landIds?: string[],
    urgent = false
  ): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke('process-ndvi-by-lands', {
        body: { tenantId, landIds, urgent },
      });

      if (error) {
        return {
          success: false,
          error: error.message || 'Failed to process lands NDVI',
        };
      }

      return data;
    } catch (error: any) {
      console.error('[LandNdviService] processLandsNdvi error:', error);
      return {
        success: false,
        error: error.message || 'Failed to process lands NDVI',
      };
    }
  }

  /**
   * Get land clusters for a tenant
   */
  async getLandClusters(tenantId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('land_clusters')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('last_processed_at', { ascending: false });

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }
}

export const landNdviService = new LandNdviService();
