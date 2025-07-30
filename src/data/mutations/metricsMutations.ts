
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { metricsService } from '@/domain/metrics/metricsService';
import { toast } from 'sonner';

export const useUpdateSystemMetric = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      metricsService.updateSystemMetric(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-metrics'] });
      toast.success('System metric updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update metric: ${error.message}`);
    },
  });
};

export const useCreateFinancialRecord = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => metricsService.createFinancialRecord(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-metrics'] });
      toast.success('Financial record created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create financial record: ${error.message}`);
    },
  });
};

export const useUpdateResourceThreshold = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ resourceType, threshold }: { resourceType: string; threshold: number }) => 
      metricsService.updateResourceThreshold(resourceType, threshold),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-metrics'] });
      toast.success('Resource threshold updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update threshold: ${error.message}`);
    },
  });
};
