import { supabase } from '@/integrations/supabase/client';
import { Result, ResultHelpers } from '@/types/common/Result';

export interface SatelliteTile {
  id: string;
  tile_id: string;
  acquisition_date: string;
  cloud_cover: number;
  status: string;
  country_id: string;
  collection: string;
  processing_level: string;
  red_band_path?: string;
  nir_band_path?: string;
  ndvi_path?: string;
  file_size_mb?: number;
  error_message?: string;
  checksum?: string;
  raw_paths?: any;
  metadata?: any;
  created_at: string;
  updated_at: string;
  processing_completed_at?: string;
  storage_verified?: boolean;
  storage_verification_date?: string;
  storage_paths_verified?: any;
}

export interface SatelliteTilesFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  cloudCoverMax?: number;
  country?: string;
}

export interface SyncResult {
  processed: number;
  inserted: number;
  updated: number;
  errors: { tile_id: string; error: string }[];
  storageAudit?: {
    verified: number;
    missing: number;
    details?: Array<{tile_id: string; files: string[]; status: string}>;
  };
}

class SatelliteTilesService {
  /**
   * Fetch satellite tiles with pagination and filtering
   */
  async fetchSatelliteTiles(
    page: number = 1, 
    pageSize: number = 20, 
    filters?: SatelliteTilesFilters
  ): Promise<Result<{ tiles: SatelliteTile[]; totalCount: number }>> {
    try {
      // Build query
      let query = supabase
        .from('satellite_tiles')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters?.status && filters.status !== 'all') {
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
      
      if (filters?.country && filters.country !== 'all') {
        query = query.eq('country_id', filters.country);
      }

      // Apply pagination and ordering
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) {
        console.error('Error fetching satellite tiles:', error);
        return ResultHelpers.error(`Failed to fetch satellite tiles: ${error.message}`);
      }

      return ResultHelpers.success({
        tiles: (data || []) as SatelliteTile[],
        totalCount: count || 0
      });
    } catch (error) {
      console.error('Error fetching satellite tiles:', error);
      return ResultHelpers.fromException(error);
    }
  }

  /**
   * Get satellite tile by ID
   */
  async getSatelliteTileById(id: string): Promise<Result<SatelliteTile>> {
    try {
      const { data, error } = await supabase
        .from('satellite_tiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching satellite tile:', error);
        return ResultHelpers.error(`Failed to fetch satellite tile: ${error.message}`);
      }

      if (!data) {
        return ResultHelpers.error('Satellite tile not found');
      }

      return ResultHelpers.success(data as SatelliteTile);
    } catch (error) {
      console.error('Error fetching satellite tile:', error);
      return ResultHelpers.fromException(error);
    }
  }

  /**
   * Sync satellite data by calling the edge function
   */
  async syncNdviData(
    params?: {
      startDate?: string;
      endDate?: string;
      cloudCoverage?: number;
      forceRefresh?: boolean;
      maxTilesPerRun?: number;
      filterType?: 'all' | 'agricultural' | 'non-agricultural';
      priorityMode?: 'baseline' | 'agricultural-priority' | 'update-existing';
      countryFilter?: string;
      stateFilter?: string;
      includeProcessed?: boolean;
    }
  ): Promise<Result<{ 
    message: string; 
    results: SyncResult;
    metadata?: {
      totalMgrsTiles: number;
      tilesWithData: number;
      pendingTiles: number;
      processingProgress: string;
      filterType: string;
      priorityMode: string;
      currentBatchSize: number;
    };
  }>> {
    try {
      console.log('[satelliteTilesService] Syncing NDVI data with params:', params);
      
      // Set default values for the hybrid approach
      const requestBody = {
        startDate: params?.startDate,
        endDate: params?.endDate,
        cloudCoverage: params?.cloudCoverage || 20,
        forceRefresh: params?.forceRefresh || false,
        maxTilesPerRun: params?.maxTilesPerRun || 50,
        filterType: params?.filterType || 'all',
        priorityMode: params?.priorityMode || 'baseline',
        countryFilter: params?.countryFilter,
        stateFilter: params?.stateFilter,
        includeProcessed: params?.includeProcessed || false
      };
      
      const { data, error } = await supabase.functions.invoke('fetch-s2-ndvi', {
        body: requestBody
      });

      if (error) {
        console.error('Error syncing NDVI data:', error);
        return ResultHelpers.error(`Failed to sync NDVI data: ${error.message}`);
      }

      console.log('[satelliteTilesService] Sync results:', data?.results);
      console.log('[satelliteTilesService] Sync metadata:', data?.metadata);
      
      return ResultHelpers.success({
        message: data.message || 'Sync completed',
        results: data.results || { 
          processed: 0, 
          inserted: 0, 
          updated: 0, 
          errors: [],
          storageAudit: {
            verified: 0,
            missing: 0,
            details: []
          }
        },
        metadata: data.metadata
      });
    } catch (error) {
      console.error('Error syncing NDVI data:', error);
      return ResultHelpers.fromException(error);
    }
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
    try {
      // Get statistics using aggregation
      const { data, error } = await supabase
        .from('satellite_tiles')
        .select('status');

      if (error) {
        console.error('Error fetching tiles statistics:', error);
        return ResultHelpers.error(`Failed to fetch statistics: ${error.message}`);
      }

      const tiles = data || [];
      const total = tiles.length;
      const ready = tiles.filter(tile => tile.status === 'completed').length;
      const pending = tiles.filter(tile => tile.status === 'pending').length;
      const errorCount = tiles.filter(tile => tile.status === 'error').length;
      
      return ResultHelpers.success({
        total,
        ready,
        pending,
        error: errorCount
      });
    } catch (error) {
      console.error('Error fetching tiles statistics:', error);
      return ResultHelpers.fromException(error);
    }
  }

  /**
   * Delete a satellite tile
   */
  async deleteTile(id: string): Promise<Result<void>> {
    try {
      const { error } = await supabase
        .from('satellite_tiles')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting tile:', error);
        return ResultHelpers.error(`Failed to delete tile: ${error.message}`);
      }

      return ResultHelpers.success();
    } catch (error) {
      console.error('Error deleting tile:', error);
      return ResultHelpers.fromException(error);
    }
  }

  /**
   * Export tiles data as CSV
   */
  async exportTilesAsCSV(filters?: SatelliteTilesFilters): Promise<Result<string>> {
    try {
      // Get all tiles with filters applied (use large page size for export)
      const tilesResult = await this.fetchSatelliteTiles(1, 10000, filters);
      
      if (!tilesResult.success || !tilesResult.data) {
        return ResultHelpers.error('Failed to fetch tiles for export');
      }
      
      const tiles = tilesResult.data.tiles;
      
      // Create CSV headers
      const headers = [
        'Tile ID',
        'Acquisition Date',
        'Cloud Cover (%)',
        'Status',
        'Country',
        'Collection',
        'Processing Level',
        'NDVI Path',
        'File Size (MB)',
        'Error Message',
        'Checksum',
        'Created At',
        'Updated At',
        'Processing Completed At'
      ];
      
      // Create CSV rows
      const rows = tiles.map(tile => [
        tile.tile_id,
        tile.acquisition_date,
        tile.cloud_cover?.toFixed(2) || '',
        tile.status,
        tile.country_id,
        tile.collection,
        tile.processing_level,
        tile.ndvi_path || '',
        tile.file_size_mb || '',
        tile.error_message || '',
        tile.checksum || '',
        new Date(tile.created_at).toLocaleString(),
        new Date(tile.updated_at).toLocaleString(),
        tile.processing_completed_at ? new Date(tile.processing_completed_at).toLocaleString() : ''
      ]);
      
      // Combine headers and rows
      const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
      
      return ResultHelpers.success(csvContent);
    } catch (error) {
      console.error('Error exporting tiles as CSV:', error);
      return ResultHelpers.fromException(error);
    }
  }
}

export const satelliteTilesService = new SatelliteTilesService();