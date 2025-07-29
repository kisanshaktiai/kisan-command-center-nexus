// Webhook and integration types
export type WebhookEvent = 
  | 'tenant.created' 
  | 'tenant.updated' 
  | 'tenant.deleted'
  | 'user.created'
  | 'user.updated'
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.cancelled'
  | 'payment.successful'
  | 'payment.failed';

export type WebhookStatus = 'active' | 'inactive' | 'failed' | 'pending';

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  status: WebhookStatus;
  secret?: string;
  headers?: Record<string, string>;
  retry_count: number;
  max_retries: number;
  timeout_ms: number;
  created_at: string;
  updated_at?: string;
  last_triggered?: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: WebhookEvent;
  payload: Record<string, unknown>;
  response_status?: number;
  response_body?: string;
  delivered_at?: string;
  failed_at?: string;
  retry_count: number;
  next_retry?: string;
}

export interface WebhookTestRequest {
  webhookId: string;
  payload: Record<string, unknown>;
}