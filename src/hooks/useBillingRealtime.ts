import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { billingRealtimeService, type BillingEventType } from '@/services/billing/BillingRealtimeService';
import { toast } from 'sonner';

interface UseBillingRealtimeOptions {
  eventType: BillingEventType;
  queryKey: string[];
  tenantId?: string;
  showNotifications?: boolean;
  onUpdate?: () => void;
}

export function useBillingRealtime(options: UseBillingRealtimeOptions) {
  const queryClient = useQueryClient();
  const { eventType, queryKey, tenantId, showNotifications = true, onUpdate } = options;

  useEffect(() => {
    const unsubscribe = billingRealtimeService.subscribe({
      eventType,
      tenantId,
      onInsert: (payload) => {
        console.log(`[${eventType}] New record:`, payload);
        queryClient.invalidateQueries({ queryKey });
        onUpdate?.();
        
        if (showNotifications) {
          toast.success(`New ${eventType} created`, {
            description: 'Data has been updated in real-time'
          });
        }
      },
      onUpdate: (payload) => {
        console.log(`[${eventType}] Updated record:`, payload);
        queryClient.invalidateQueries({ queryKey });
        onUpdate?.();
        
        if (showNotifications) {
          toast.info(`${eventType} updated`, {
            description: 'Changes reflected in real-time'
          });
        }
      },
      onDelete: (payload) => {
        console.log(`[${eventType}] Deleted record:`, payload);
        queryClient.invalidateQueries({ queryKey });
        onUpdate?.();
        
        if (showNotifications) {
          toast.warning(`${eventType} deleted`, {
            description: 'Record has been removed'
          });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [eventType, tenantId, queryKey, queryClient, showNotifications, onUpdate]);
}
