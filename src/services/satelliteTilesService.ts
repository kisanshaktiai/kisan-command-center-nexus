import { supabase } from '@/integrations/supabase/client';
import { BaseQueryService } from '@/shared/services/BaseQueryService';
import { Result, ResultHelpers, wrapAsync } from '@/types/common/Result';

export interface SatelliteTile {
  id: string;
  tile_id: string;
  acquisition_date: string;
  cloud_cover: number;
  status: 'pending' | 'completed' | 'error';
  ndvi_path?: string;
  file_size_mb?: number;
  created_at: string;
  updated_at?: string;
  error_message?: string;
  collection?: string;
  processing_level?: string;
  red_band_path?: string;
  nir_band_path?: string;
  metadata?: any;
  raw_paths?: string[];
  checksum?: string;
  country_id?: string;
}

export interface SatelliteTilesFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  cloudCoverMax?: number;
  countryId?: string;
}

export interface SyncResult {
  processed: number;
  inserted: number;
  updated: number;
  errors: any[];
}

class SatelliteTilesService extends BaseQueryService {
  /**
   * Fetch satellite tiles with pagination and filtering
   */
  async fetchSatelliteTiles(
    page: number = 1,
    pageSize: number = 10,
    filters?: SatelliteTilesFilters
  ): Promise<Result<{ tiles: SatelliteTile[]; totalCount: number }>> {
    return wrapAsync(async () => {
      let query = supabase
        .from('satellite_tiles')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.startDate) {
        query = query.gte('acquisition_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('acquisition_date', filters.endDate);
      }
      if (filters?.cloudCoverMax) {
        query = query.lte('cloud_cover', filters.cloudCoverMax);
      }
      if (filters?.countryId) {
        query = query.eq('country_id', filters.countryId);
      }

      // Apply pagination and sorting
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      query = query
        .order('acquisition_date', { ascending: false })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        tiles: data || [],
        totalCount: count || 0
      };
    }, 'fetchSatelliteTiles');
  }

  /**
   * Get satellite tile by ID
   */
  async getSatelliteTileById(id: string): Promise<Result<SatelliteTile>> {
    return wrapAsync(async () => {
      const { data, error } = await supabase
        .from('satellite_tiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Satellite tile not found');

      return data;
    }, 'getSatelliteTileById');
  }

  /**
   * Sync satellite data by calling the edge function
   */
  async syncNdviData(params?: {
    startDate?: string;
    endDate?: string;
    cloudCoverage?: number;
    forceRefresh?: boolean;
  }): Promise<Result<{ message: string; results: SyncResult }>> {
    return wrapAsync(async () => {
      const { data, error } = await supabase.functions.invoke('fetch-s2-ndvi', {
        body: params || {}
      });

      if (error) throw error;
      
      return data;
    }, 'syncNdviData');
  }

  /**
   * Get statistics for satellite tiles
   */
  async getTilesStatistics(): Promise<Result<{
    total: number;
    ready: number;
    pending: number;
    error: number;
  }>> {
    return wrapAsync(async () => {
      const { data, error } = await supabase
        .from('satellite_tiles')
        .select('status');

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        ready: 0,
        pending: 0,
        error: 0
      };

      data?.forEach(tile => {
        if (tile.status === 'completed') stats.ready++;
        else if (tile.status === 'pending') stats.pending++;
        else if (tile.status === 'error') stats.error++;
      });

      return stats;
    }, 'getTilesStatistics');
  }

  /**
   * Delete a satellite tile
   */
  async deleteTile(id: string): Promise<Result<void>> {
    return wrapAsync(async () => {
      const { error } = await supabase
        .from('satellite_tiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
    }, 'deleteTile');
  }

  /**
   * Export tiles data as CSV
   */
  async exportTilesAsCSV(filters?: SatelliteTilesFilters): Promise<Result<string>> {
    return wrapAsync(async () => {
      // Fetch all tiles with filters
      let query = supabase
        .from('satellite_tiles')
        .select('*');

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.startDate) {
        query = query.gte('acquisition_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('acquisition_date', filters.endDate);
      }

      const { data, error } = await query
        .order('acquisition_date', { ascending: false });

      if (error) throw error;

      // Convert to CSV
      const headers = ['Tile ID', 'Acquisition Date', 'Cloud Cover', 'Status', 'NDVI Path', 'File Size (MB)', 'Error Message'];
      const rows = data?.map(tile => [
        tile.tile_id,
        tile.acquisition_date,
        tile.cloud_cover,
        tile.status,
        tile.ndvi_path || '',
        tile.file_size_mb || '',
        tile.error_message || ''
      ]) || [];

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      return csv;
    }, 'exportTilesAsCSV');
  }
}

export const satelliteTilesService = new SatelliteTilesService();