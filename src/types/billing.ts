// Consolidated billing-related types
export type SubscriptionPlan = 'starter' | 'growth' | 'enterprise' | 'custom';
export type PaymentStatus = 'current' | 'overdue' | 'failed' | 'pending';
export type BillingInterval = 'month' | 'year' | 'quarter';

export interface BillingPlan {
  id: string;
  name: string;
  description?: string | null;
  plan_type: SubscriptionPlan;
  base_price: number;
  currency: string;
  billing_interval?: BillingInterval | null;
  features: Record<string, boolean | number | string>;
  limits: Record<string, number>;
  usage_limits: Record<string, number>;
  is_active: boolean;
  is_custom: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  tenant_id?: string | null;
}

export interface CreateBillingPlanRequest {
  name: string;
  description?: string | null;
  plan_type: SubscriptionPlan;
  base_price: number;
  currency: string;
  billing_interval: BillingInterval;
  features: Record<string, boolean | number | string>;
  limits: Record<string, number>;
  usage_limits: Record<string, number>;
  is_active: boolean;
  is_custom: boolean;
  tenant_id?: string | null;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method: string;
  transaction_id: string;
  created_at: string;
  gateway_response: Record<string, unknown>;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  due_date: string;
  created_at: string;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  metadata: Record<string, unknown>;
}

export interface FinancialData {
  mrr: number;
  totalRevenue: number;
  payments: PaymentRecord[];
  invoices: Invoice[];
  subscriptions: BillingPlan[];
}

export interface UsageRecord {
  id: string;
  tenant_id: string;
  resource_type: string;
  usage_amount: number;
  billing_period: string;
  recorded_at: string;
}