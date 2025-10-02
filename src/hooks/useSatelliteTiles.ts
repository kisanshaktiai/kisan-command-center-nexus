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

  // Mutation for syncing NDVI data with support for multiple data sources
  const syncNdviData = useMutation({
    mutationFn: async (params?: {
      startDate?: string;
      endDate?: string;
      cloudCoverage?: number;
      forceRefresh?: boolean;
      regions?: string[];
      tileIds?: string[];
    }) => {
      // Call the new MGRS-based Copernicus NDVI function
      const { data, error } = await supabase.functions.invoke('fetch-copernicus-ndvi', {
        body: {
          startDate: params?.startDate,
          endDate: params?.endDate,
          cloudCoverage: params?.cloudCoverage || 20,
          regions: params?.regions || ['Punjab', 'Haryana'],
          tileIds: params?.tileIds || []
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Sync failed');
      
      return data;
    },
    onSuccess: (data) => {
      const tilesProcessed = data?.mgrsTilesProcessed || 0;
      const message = data?.message || `Processed ${tilesProcessed} MGRS tiles from database`;
      toast.success(message);
      
      if (data?.results) {
        const details = `Processed: ${data.results.processed || 0} tiles (${data.results.inserted || 0} new, ${data.results.updated || 0} updated)`;
        toast.info(details);
        
        if (data.results.errors && data.results.errors.length > 0) {
          toast.warning(`${data.results.errors.length} tiles had errors`);
        }
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