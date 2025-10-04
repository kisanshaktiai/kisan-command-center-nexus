import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { landNdviService } from '@/services/landNdviService';
import { toast } from 'sonner';

export const useLandNdvi = (landId: string) => {
  const queryClient = useQueryClient();

  // Query for cached NDVI data
  const {
    data: cachedData,
    isLoading: isCacheLoading,
    error: cacheError
  } = useQuery({
    queryKey: ['land-ndvi-cache', landId],
    queryFn: async () => {
      const result = await landNdviService.getCachedNdvi(landId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    enabled: !!landId,
    staleTime: 60000, // Consider data fresh for 1 minute
  });

  // Query for NDVI history
  const {
    data: historyData,
    isLoading: isHistoryLoading
  } = useQuery({
    queryKey: ['land-ndvi-history', landId],
    queryFn: async () => {
      const result = await landNdviService.getNdviHistory(landId, 30);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    enabled: !!landId,
  });

  // Mutation for fetching NDVI data
  const fetchNdvi = useMutation({
    mutationFn: async ({ urgent = false, statisticsOnly = true }: {
      urgent?: boolean;
      statisticsOnly?: boolean;
    }) => {
      const result = await landNdviService.fetchLandNdvi(landId, urgent, statisticsOnly);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (data) => {
      if (data.cached) {
        toast.info('NDVI data served from cache');
      } else if (data.status === 'queued') {
        toast.success('Request queued for batch processing');
        toast.info(`Estimated ready in: ${data.estimatedReady}`);
      } else {
        toast.success('NDVI data fetched successfully');
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['land-ndvi-cache', landId] });
      queryClient.invalidateQueries({ queryKey: ['land-ndvi-history', landId] });
    },
    onError: (error: Error) => {
      console.error('Fetch NDVI error:', error);
      toast.error(`Failed to fetch NDVI: ${error.message}`);
    },
  });

  return {
    cachedData,
    historyData,
    isCacheLoading,
    isHistoryLoading,
    cacheError,
    fetchNdvi,
    isFetching: fetchNdvi.isPending,
  };
};

/**
 * Hook for processing NDVI using land-first clustering approach
 */
export const useProcessLandsNdvi = (tenantId: string) => {
  const queryClient = useQueryClient();

  const processLands = useMutation({
    mutationFn: async ({
      landIds,
      urgent = false
    }: {
      landIds?: string[];
      urgent?: boolean;
    }) => {
      const result = await landNdviService.processLandsNdvi(tenantId, landIds, urgent);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (data) => {
      toast.success(`Processed NDVI for ${data.processed_lands} lands`);
      
      // Invalidate all land NDVI caches
      queryClient.invalidateQueries({ queryKey: ['land-ndvi-cache'] });
      queryClient.invalidateQueries({ queryKey: ['land-ndvi-history'] });
      queryClient.invalidateQueries({ queryKey: ['land-clusters'] });
    },
    onError: (error: Error) => {
      console.error('Process lands NDVI error:', error);
      toast.error(`Failed to process NDVI: ${error.message}`);
    },
  });

  return {
    processLands,
    isProcessing: processLands.isPending,
  };
};

/**
 * Hook for fetching land clusters
 */
export const useLandClusters = (tenantId: string) => {
  return useQuery({
    queryKey: ['land-clusters', tenantId],
    queryFn: async () => {
      const result = await landNdviService.getLandClusters(tenantId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    enabled: !!tenantId,
    staleTime: 300000, // 5 minutes
  });
};

export const useBatchNdviRequest = () => {
  const queryClient = useQueryClient();

  const queueBatch = useMutation({
    mutationFn: async ({
      tenantId,
      landIds,
      dateFrom,
      dateTo,
      priority = 5
    }: {
      tenantId: string;
      landIds: string[];
      dateFrom: string;
      dateTo: string;
      priority?: number;
    }) => {
      const result = await landNdviService.queueBatchRequest(
        tenantId,
        landIds,
        dateFrom,
        dateTo,
        priority
      );
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (data) => {
      toast.success(`Batch request queued for ${data.land_ids.length} lands`);
      queryClient.invalidateQueries({ queryKey: ['ndvi-queue-status'] });
    },
    onError: (error: Error) {
      toast.error(`Batch request failed: ${error.message}`);
    },
  });

  return {
    queueBatch,
    isQueuing: queueBatch.isPending,
  };
};
