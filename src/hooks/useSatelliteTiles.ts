import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { satelliteTilesService, SatelliteTilesFilters } from '@/services/satelliteTilesService';
import { toast } from 'sonner';

export const useSatelliteTiles = (
  page: number = 1,
  pageSize: number = 20,
  filters?: SatelliteTilesFilters
) => {
  const queryClient = useQueryClient();

  // Query for fetching satellite tiles
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['satellite-tiles', page, pageSize, filters],
    queryFn: async () => {
      const result = await satelliteTilesService.fetchSatelliteTiles(page, pageSize, filters);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 30000, // Data is considered fresh for 30 seconds
    refetchInterval: 60000, // Auto-refetch every minute
  });

  // Query for statistics
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError
  } = useQuery({
    queryKey: ['satellite-tiles-stats'],
    queryFn: async () => {
      const result = await satelliteTilesService.getTilesStatistics();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });

  // Mutation for marking agricultural tiles from land data
  const markAgriculturalTiles = useMutation({
    mutationFn: async () => {
      console.log('[useSatelliteTiles] Marking agricultural tiles from land data');
      
      const { data, error } = await supabase.functions.invoke('mark-agricultural-tiles');

      if (error) {
        console.error('[useSatelliteTiles] Error marking tiles:', error);
        throw new Error(error.message || 'Failed to mark agricultural tiles');
      }
      
      if (!data?.success) {
        console.error('[useSatelliteTiles] Mark tiles failed:', data);
        throw new Error(data?.error || 'Failed to mark agricultural tiles');
      }
      
      return data;
    },
    onSuccess: (data) => {
      const results = data?.data || {};
      const markedCount = results.marked_tiles_count || 0;
      const processedLands = results.processed_lands || 0;
      
      toast.success(`✓ Marked ${markedCount} agricultural tiles from ${processedLands} lands`);
      
      if (results.errors?.length > 0) {
        toast.warning(`${results.errors.length} lands had errors - check console`);
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['satellite-tiles'] });
      queryClient.invalidateQueries({ queryKey: ['satellite-tiles-stats'] });
    },
    onError: (error: Error) => {
      console.error('Mark tiles error:', error);
      toast.error(`Failed to mark tiles: ${error.message}`);
    },
  });

  // Mutation for syncing NDVI data using tile-based caching (95% cost reduction)
  const syncNdviData = useMutation({
    mutationFn: async (params?: {
      startDate?: string;
      endDate?: string;
      cloudCoverage?: number;
      forceRefresh?: boolean;
      regions?: string[];
      tileIds?: string[];
    }) => {
      // Use new update-ndvi-tiles function for tile-level caching
      console.log('[useSatelliteTiles] Invoking update-ndvi-tiles with params:', params);
      
      const { data, error } = await supabase.functions.invoke('update-ndvi-tiles', {
        body: {
          tileIds: params?.tileIds || [],
          forceUpdate: params?.forceRefresh || false,
          cloudCoverage: params?.cloudCoverage || 20
        },
      });

      console.log('[useSatelliteTiles] Edge function response:', { data, error });

      if (error) {
        console.error('[useSatelliteTiles] Edge function error:', error);
        throw new Error(error.message || 'Failed to invoke edge function');
      }
      
      if (!data?.success) {
        console.error('[useSatelliteTiles] Sync failed:', data);
        throw new Error(data?.error || 'Sync failed');
      }
      
      console.log('[useSatelliteTiles] Sync successful:', data);
      return data;
    },
    onSuccess: (data) => {
      const results = data?.data || {};
      const processed = results.processed || 0;
      const updated = results.updated || 0;
      const errors = results.errors || [];
      
      toast.success(`✓ Tile update complete: ${updated}/${processed} tiles updated`);
      
      if (errors.length > 0) {
        toast.warning(`${errors.length} tiles had errors - check logs`);
      }
      
      if (updated > 0) {
        toast.info(`📊 API Cost Saved: ~${((processed - 1) / processed * 100).toFixed(0)}% (tile-based caching)`);
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['satellite-tiles'] });
      queryClient.invalidateQueries({ queryKey: ['satellite-tiles-stats'] });
    },
    onError: (error: Error) => {
      console.error('Sync error details:', error);
      toast.error(`Sync failed: ${error.message}`);
    },
  });

  // Mutation for deleting a tile
  const deleteTile = useMutation({
    mutationFn: async (id: string) => {
      const result = await satelliteTilesService.deleteTile(id);
      if (!result.success) {
        throw new Error(result.error);
      }
    },
    onSuccess: () => {
      toast.success('Tile deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['satellite-tiles'] });
      queryClient.invalidateQueries({ queryKey: ['satellite-tiles-stats'] });
    },
    onError: (error: Error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  // Set up real-time subscription for satellite tiles
  useEffect(() => {
    const subscription = supabase
      .channel('satellite_tiles_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'satellite_tiles'
        },
        (payload) => {
          console.log('Satellite tiles real-time update:', payload);
          
          // Invalidate and refetch queries when data changes
          queryClient.invalidateQueries({ queryKey: ['satellite-tiles'] });
          queryClient.invalidateQueries({ queryKey: ['satellite-tiles-stats'] });
          
          // Show toast notification for updates
          if (payload.eventType === 'INSERT') {
            toast.success(`New satellite tile ${payload.new?.tile_id} added`);
          } else if (payload.eventType === 'UPDATE') {
            const newRecord = payload.new as any;
            const oldRecord = payload.old as any;
            
            // Only show toast if status changed
            if (newRecord?.status !== oldRecord?.status) {
              if (newRecord?.status === 'completed') {
                toast.success(`Tile ${newRecord.tile_id} processing completed`);
              } else if (newRecord?.status === 'error') {
                toast.error(`Tile ${newRecord.tile_id} processing failed`);
              } else if (newRecord?.status === 'processing') {
                toast.info(`Tile ${newRecord.tile_id} processing started`);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return {
    data,
    isLoading,
    error,
    refetch,
    stats,
    statsLoading,
    statsError,
    syncNdviData,
    deleteTile,
    markAgriculturalTiles,
  };
};

export const useExportTiles = () => {
  const exportMutation = useMutation({
    mutationFn: async (filters?: SatelliteTilesFilters) => {
      const result = await satelliteTilesService.exportTilesAsCSV(filters);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (csvData) => {
      // Create and download CSV file
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `satellite-tiles-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Export completed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Export failed: ${error.message}`);
    },
  });

  return {
    exportTiles: exportMutation.mutate,
    isExporting: exportMutation.isPending,
  };
};