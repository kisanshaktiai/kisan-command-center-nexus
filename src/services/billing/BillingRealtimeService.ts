import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type BillingEventType = 'subscription' | 'invoice' | 'payment' | 'wallet' | 'analytics';

export interface BillingRealtimeConfig {
  eventType: BillingEventType;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  tenantId?: string;
}

class BillingRealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();

  private getTableName(eventType: BillingEventType): string {
    const tableMap: Record<BillingEventType, string> = {
      subscription: 'tenant_subscriptions',
      invoice: 'invoices',
      payment: 'payment_records',
      wallet: 'tenant_wallets',
      analytics: 'billing_analytics'
    };
    return tableMap[eventType];
  }

  subscribe(config: BillingRealtimeConfig): () => void {
    const tableName = this.getTableName(config.eventType);
    const channelKey = `${tableName}-${config.tenantId || 'all'}`;

    // Remove existing channel if present
    this.unsubscribe(channelKey);

    const channel = supabase
      .channel(`${channelKey}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          ...(config.tenantId && {
            filter: `tenant_id=eq.${config.tenantId}`
          })
        },
        (payload) => {
          console.log(`[Realtime] ${tableName} change:`, payload);
          
          switch (payload.eventType) {
            case 'INSERT':
              config.onInsert?.(payload.new);
              break;
            case 'UPDATE':
              config.onUpdate?.(payload.new);
              break;
            case 'DELETE':
              config.onDelete?.(payload.old);
              break;
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] ${channelKey} subscription status:`, status);
      });

    this.channels.set(channelKey, channel);

    // Return cleanup function
    return () => this.unsubscribe(channelKey);
  }

  unsubscribe(channelKey: string): void {
    const channel = this.channels.get(channelKey);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelKey);
      console.log(`[Realtime] Unsubscribed from ${channelKey}`);
    }
  }

  unsubscribeAll(): void {
    this.channels.forEach((channel, key) => {
      supabase.removeChannel(channel);
      console.log(`[Realtime] Unsubscribed from ${key}`);
    });
    this.channels.clear();
  }
}

export const billingRealtimeService = new BillingRealtimeService();
