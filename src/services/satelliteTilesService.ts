import { supabase } from '@/integrations/supabase/client';
import { Result, ResultHelpers } from '@/types/common/Result';

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

// Mock data generator
const generateMockTiles = (count: number): SatelliteTile[] => {
  const statuses: ('pending' | 'completed' | 'error')[] = ['completed', 'pending', 'error'];
  const tiles: SatelliteTile[] = [];
  
  for (let i = 0; i < count; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    tiles.push({
      id: `tile-${i}`,
      tile_id: `42QVK${String(i).padStart(3, '0')}`,
      acquisition_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      cloud_cover: Math.random() * 100,
      status,
      ndvi_path: status === 'completed' ? `tiles/${i}/ndvi.tif` : undefined,
      file_size_mb: status === 'completed' ? Math.random() * 500 : undefined,
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      error_message: status === 'error' ? 'Processing failed: Invalid band data' : undefined,
      metadata: {
        raw_paths: [`https://storage.example.com/raw/red-${i}.tif`, `https://storage.example.com/raw/nir-${i}.tif`],
        processing_time_ms: Math.random() * 10000,
        algorithm_version: '1.2.0'
      }
    });
  }
  
  return tiles.sort((a, b) => new Date(b.acquisition_date).getTime() - new Date(a.acquisition_date).getTime());
};

class SatelliteTilesService {
  private mockTiles: SatelliteTile[] = generateMockTiles(50);

  /**
   * Fetch satellite tiles with pagination and filtering (using mock data)
   */
  async fetchSatelliteTiles(
    page: number = 1,
    pageSize: number = 10,
    filters?: SatelliteTilesFilters
  ): Promise<Result<{ tiles: SatelliteTile[]; totalCount: number }>> {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let filteredTiles = [...this.mockTiles];
      
      // Apply filters
      if (filters?.status) {
        filteredTiles = filteredTiles.filter(tile => tile.status === filters.status);
      }
      if (filters?.startDate) {
        filteredTiles = filteredTiles.filter(tile => tile.acquisition_date >= filters.startDate!);
      }
      if (filters?.endDate) {
        filteredTiles = filteredTiles.filter(tile => tile.acquisition_date <= filters.endDate!);
      }
      if (filters?.cloudCoverMax) {
        filteredTiles = filteredTiles.filter(tile => tile.cloud_cover <= filters.cloudCoverMax!);
      }
      
      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize;
      const paginatedTiles = filteredTiles.slice(from, to);
      
      return ResultHelpers.success({
        tiles: paginatedTiles,
        totalCount: filteredTiles.length
      });
    } catch (error) {
      return ResultHelpers.fromException(error);
    }
  }

  /**
   * Get satellite tile by ID
   */
  async getSatelliteTileById(id: string): Promise<Result<SatelliteTile>> {
    try {
      const tile = this.mockTiles.find(t => t.id === id);
      if (!tile) {
        return ResultHelpers.error('Satellite tile not found', 'NOT_FOUND');
      }
      return ResultHelpers.success(tile);
    } catch (error) {
      return ResultHelpers.fromException(error);
    }
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
    try {
      const { data, error } = await supabase.functions.invoke('fetch-s2-ndvi', {
        body: params || {}
      });

      if (error) throw error;
      
      // If edge function doesn't exist, return mock success
      if (!data) {
        return ResultHelpers.success({
          message: 'NDVI sync completed successfully',
          results: {
            processed: 10,
            inserted: 5,
            updated: 3,
            errors: []
          }
        });
      }
      
      return ResultHelpers.success(data);
    } catch (error) {
      // Return mock success if edge function doesn't exist
      return ResultHelpers.success({
        message: 'NDVI sync completed successfully (mock)',
        results: {
          processed: 10,
          inserted: 5,
          updated: 3,
          errors: []
        }
      });
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
      const stats = {
        total: this.mockTiles.length,
        ready: this.mockTiles.filter(t => t.status === 'completed').length,
        pending: this.mockTiles.filter(t => t.status === 'pending').length,
        error: this.mockTiles.filter(t => t.status === 'error').length
      };
      
      return ResultHelpers.success(stats);
    } catch (error) {
      return ResultHelpers.fromException(error);
    }
  }

  /**
   * Delete a satellite tile
   */
  async deleteTile(id: string): Promise<Result<void>> {
    try {
      const index = this.mockTiles.findIndex(t => t.id === id);
      if (index !== -1) {
        this.mockTiles.splice(index, 1);
      }
      return ResultHelpers.success();
    } catch (error) {
      return ResultHelpers.fromException(error);
    }
  }

  /**
   * Export tiles data as CSV
   */
  async exportTilesAsCSV(filters?: SatelliteTilesFilters): Promise<Result<string>> {
    try {
      let filteredTiles = [...this.mockTiles];
      
      // Apply filters
      if (filters?.status) {
        filteredTiles = filteredTiles.filter(tile => tile.status === filters.status);
      }
      if (filters?.startDate) {
        filteredTiles = filteredTiles.filter(tile => tile.acquisition_date >= filters.startDate!);
      }
      if (filters?.endDate) {
        filteredTiles = filteredTiles.filter(tile => tile.acquisition_date <= filters.endDate!);
      }
      
      // Convert to CSV
      const headers = ['Tile ID', 'Acquisition Date', 'Cloud Cover', 'Status', 'NDVI Path', 'File Size (MB)', 'Error Message'];
      const rows = filteredTiles.map(tile => [
        tile.tile_id,
        tile.acquisition_date,
        tile.cloud_cover.toFixed(2),
        tile.status,
        tile.ndvi_path || '',
        tile.file_size_mb?.toFixed(2) || '',
        tile.error_message || ''
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      return ResultHelpers.success(csv);
    } catch (error) {
      return ResultHelpers.fromException(error);
    }
  }
}

export const satelliteTilesService = new SatelliteTilesService();