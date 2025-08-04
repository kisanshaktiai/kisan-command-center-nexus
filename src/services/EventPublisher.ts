
import { supabase } from '@/integrations/supabase/client';
import type { LeadEvent, ActionContext } from '@/types/leads';

export class EventPublisher {
  private static instance: EventPublisher;
  private eventQueue: LeadEvent[] = [];

  static getInstance(): EventPublisher {
    if (!this.instance) {
      this.instance = new EventPublisher();
    }
    return this.instance;
  }

  async publishLeadEvent(
    eventType: LeadEvent['event_type'],
    leadId: string,
    tenantId: string,
    eventData: Record<string, any>,
    context: ActionContext
  ): Promise<void> {
    const event: LeadEvent = {
      event_type: eventType,
      lead_id: leadId,
      tenant_id: tenantId,
      event_data: eventData,
      context: context,
      timestamp: new Date().toISOString()
    };

    // Add to local queue for immediate processing
    this.eventQueue.push(event);

    try {
      // Publish to external systems via edge function
      const { error } = await supabase.functions.invoke('process-lead-event', {
        body: event
      });

      if (error) {
        console.warn('Failed to publish event to external queue:', error);
      }

      console.log('Lead event published:', eventType, leadId);
    } catch (error) {
      console.error('Error publishing lead event:', error);
    }
  }

  async publishBulkEvents(events: LeadEvent[]): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('process-bulk-lead-events', {
        body: { events }
      });

      if (error) {
        console.warn('Failed to publish bulk events:', error);
      }
    } catch (error) {
      console.error('Error publishing bulk events:', error);
    }
  }

  getQueuedEvents(): LeadEvent[] {
    return [...this.eventQueue];
  }

  clearQueue(): void {
    this.eventQueue = [];
  }
}

export const eventPublisher = EventPublisher.getInstance();
