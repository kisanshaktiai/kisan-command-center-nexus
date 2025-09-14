
export interface TenantSubscription {
  id: string;
  tenant_id: string;
  billing_plan_id: string;
  status: 'active' | 'cancelled' | 'expired' | 'suspended' | 'trial';
  billing_cycle: 'monthly' | 'quarterly' | 'annually';
  current_period_start: string;
  current_period_end: string;
  trial_start?: string;
  trial_end?: string;
  cancelled_at?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  billing_plan?: {
    id: string;
    name: string;
    price_monthly: number;
    price_annually: number;
    features: Record<string, any>;
    limits: Record<string, any>;
  };
}

export interface PaymentRecord {
  id: string;
  tenant_id: string;
  subscription_id?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  payment_method: 'card' | 'bank_transfer' | 'digital_wallet' | 'other';
  payment_provider?: string;
  provider_transaction_id?: string;
  provider_response: Record<string, any>;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  subscription_id?: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  due_date: string;
  paid_at?: string;
  invoice_data: Record<string, any>;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionRenewal {
  id: string;
  tenant_id: string;
  subscription_id: string;
  renewal_date: string;
  amount: number;
  currency: string;
  status: 'scheduled' | 'processing' | 'completed' | 'failed' | 'cancelled';
  previous_plan_id?: string;
  new_plan_id?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TenantLimit {
  id: string;
  tenant_id: string;
  limit_type: 'farmers' | 'dealers' | 'products' | 'storage_gb' | 'api_calls_per_day' | 'custom';
  limit_value: number;
  current_usage: number;
  soft_limit?: number;
  hard_limit?: number;
  reset_period: 'daily' | 'weekly' | 'monthly' | 'annually' | 'never';
  last_reset_at: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TenantUsageTracking {
  id: string;
  tenant_id: string;
  resource_type: 'api_calls' | 'storage' | 'users' | 'data_export' | 'custom';
  usage_date: string;
  usage_count: number;
  usage_details: Record<string, any>;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TenantArchiveJob {
  id: string;
  tenant_id: string;
  archive_location: string;
  encryption_key_id?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  archive_size_bytes?: number;
  error_details?: Record<string, any>;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}
