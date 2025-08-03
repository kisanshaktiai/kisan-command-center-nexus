
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billingService } from '@/domain/billing/billingService';
import { toast } from 'sonner';

export const useSubscriptions = (tenantId?: string) => {
  return useQuery({
    queryKey: ['subscriptions', tenantId],
    queryFn: () => billingService.getSubscriptions(tenantId),
  });
};

export const useInvoices = (tenantId?: string) => {
  return useQuery({
    queryKey: ['invoices', tenantId],
    queryFn: () => billingService.getInvoices(tenantId),
  });
};

export const useCreateSubscription = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: billingService.createSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('Subscription created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create subscription: ${error.message}`);
    },
  });
};

export const useUpdateSubscription = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      billingService.updateSubscription(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('Subscription updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update subscription: ${error.message}`);
    },
  });
};
