import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { satelliteTilesService, SatelliteTilesFilters } from '@/services/satelliteTilesService';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSatelliteTiles = (
  page: number = 1,
  pageSize: number = 10,
  filters?: SatelliteTilesFilters
) => {
  const queryClient = useQueryClient();

  // Query for fetching satellite tiles
  const tilesQuery = useQuery({
    queryKey: ['satellite-tiles', page, pageSize, filters],
    queryFn: async () => {
      const result = await satelliteTilesService.fetchSatelliteTiles(page, pageSize, filters);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Query for statistics
  const statsQuery = useQuery({
    queryKey: ['satellite-tiles-stats'],
    queryFn: async () => {
      const result = await satelliteTilesService.getTilesStatistics();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    refetchInterval: 30000,
  });

  // Mutation for syncing NDVI data
  const syncMutation = useMutation({
    mutationFn: async (params?: {
      startDate?: string;
      endDate?: string;
      cloudCoverage?: number;
      forceRefresh?: boolean;
    }) => {
      const result = await satelliteTilesService.syncNdviData(params);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (data) => {
      toast.success(`Sync completed: ${data.results.inserted} new, ${data.results.updated} updated`);
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['satellite-tiles'] });
      queryClient.invalidateQueries({ queryKey: ['satellite-tiles-stats'] });
    },
    onError: (error: Error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });

  // Mutation for deleting a tile
  const deleteMutation = useMutation({
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

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('satellite-tiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'satellite_tiles'
        },
        (payload) => {
          console.log('Real-time update:', payload);
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['satellite-tiles'] });
          queryClient.invalidateQueries({ queryKey: ['satellite-tiles-stats'] });
          
          // Show notification based on event type
          if (payload.eventType === 'INSERT') {
            toast.info('New satellite tile added');
          } else if (payload.eventType === 'UPDATE') {
            const newRecord = payload.new as any;
            if (newRecord.status === 'completed') {
              toast.success(`Tile ${newRecord.tile_id} processing completed`);
            } else if (newRecord.status === 'error') {
              toast.error(`Tile ${newRecord.tile_id} processing failed`);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    tiles: tilesQuery.data?.tiles || [],
    totalCount: tilesQuery.data?.totalCount || 0,
    isLoading: tilesQuery.isLoading,
    error: tilesQuery.error,
    refetch: tilesQuery.refetch,
    stats: statsQuery.data,
    statsLoading: statsQuery.isLoading,
    syncNdviData: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
    deleteTile: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
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