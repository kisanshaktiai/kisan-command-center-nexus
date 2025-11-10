// Unified Billing Types for Phase 2+ Schema

export type PlanType = 'starter' | 'growth' | 'enterprise' | 'custom' | 'standard';
export type SubscriptionStatus = 'pending' | 'active' | 'expired' | 'cancelled' | 'suspended';
export type TransactionStatus = 'pending' | 'processing' | 'success' | 'failed' | 'refunded';
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type PaymentGateway = 'virtual' | 'razorpay' | 'stripe' | 'manual';
export type PaymentMode = 'online' | 'offline' | 'wallet';
export type KYCStatus = 'pending' | 'submitted' | 'verified' | 'rejected';

// Plan (Unified subscription plan)
export interface Plan {
  id: string;
  tenant_id?: string;
  title: string;
  description?: string;
  plan_type: PlanType;
  duration_days: number;
  price: number;
  currency: string;
  features: Record<string, any>;
  limits: Record<string, any>;
  is_active: boolean;
  is_global: boolean;
  sort_order: number;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

// Subscription (Farmer subscription)
export interface Subscription {
  id: string;
  farmer_id: string;
  tenant_id: string;
  plan_id: string;
  payment_gateway: PaymentGateway;
  payment_id?: string;
  amount: number;
  currency: string;
  status: SubscriptionStatus;
  start_date?: string;
  end_date?: string;
  auto_renew: boolean;
  activation_code_id?: string;
  metadata: Record<string, any>;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

// Transaction (Payment transaction)
export interface Transaction {
  id: string;
  subscription_id?: string;
  tenant_id: string;
  farmer_id?: string;
  gateway: PaymentGateway;
  gateway_txn_id?: string;
  payment_intent_id?: string;
  amount: number;
  currency: string;
  payment_mode: PaymentMode;
  payment_method?: string;
  virtual_mode: boolean;
  status: TransactionStatus;
  gateway_response: Record<string, any>;
  failure_reason?: string;
  processed_at?: string;
  refunded_at?: string;
  refund_amount?: number;
  metadata: Record<string, any>;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

// Payout (Tenant commission/settlement)
export interface Payout {
  id: string;
  tenant_id: string;
  transaction_id?: string;
  amount: number;
  currency: string;
  commission_rate?: number;
  status: PayoutStatus;
  payout_method?: string;
  transfer_ref?: string;
  gateway_response: Record<string, any>;
  processed_at?: string;
  failed_at?: string;
  failure_reason?: string;
  metadata: Record<string, any>;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

// Tenant with billing fields
export interface TenantWithBilling {
  id: string;
  name: string;
  slug: string;
  commission_rate: number;
  payout_method: string;
  bank_details: Record<string, any>;
  kyc_status: KYCStatus;
  kyc_documents: any[];
  archived: boolean;
  created_at: string;
  updated_at: string;
}

// Activation Code (enhanced)
export interface ActivationCode {
  id: string;
  code: string;
  tenant_id: string;
  plan_id?: string;
  is_active: boolean;
  max_uses?: number;
  used_count: number;
  created_at: string;
  expires_at?: string;
  last_used_at?: string;
  created_by?: string;
  redeemed_by?: string;
  redeemed_at?: string;
  status: 'active' | 'used' | 'expired' | 'cancelled';
  metadata: Record<string, any>;
  archived: boolean;
}

// Farmer with subscription fields
export interface FarmerWithSubscription {
  id: string;
  farmer_name?: string;
  mobile_number?: string;
  tenant_id?: string;
  current_subscription_id?: string;
  subscription_status: string;
  subscription_expires_at?: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

// Create requests
export interface CreatePlanRequest {
  tenant_id?: string;
  title: string;
  description?: string;
  plan_type: PlanType;
  duration_days: number;
  price: number;
  currency: string;
  features?: Record<string, any>;
  limits?: Record<string, any>;
  is_global?: boolean;
  sort_order?: number;
}

export interface CreateSubscriptionRequest {
  farmer_id: string;
  tenant_id: string;
  plan_id: string;
  payment_gateway: PaymentGateway;
  payment_id?: string;
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
}

export interface CreateTransactionRequest {
  subscription_id?: string;
  tenant_id: string;
  farmer_id?: string;
  gateway: PaymentGateway;
  gateway_txn_id?: string;
  payment_intent_id?: string;
  amount: number;
  currency: string;
  payment_mode?: PaymentMode;
  payment_method?: string;
  virtual_mode?: boolean;
  gateway_response?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface CreatePayoutRequest {
  tenant_id: string;
  transaction_id?: string;
  amount: number;
  currency: string;
  commission_rate?: number;
  payout_method?: string;
  metadata?: Record<string, any>;
}

// Views
export interface ActiveSubscriptionView {
  id: string;
  farmer_id: string;
  tenant_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  start_date?: string;
  end_date?: string;
  farmer_name?: string;
  mobile_number?: string;
  tenant_name: string;
  plan_title: string;
  duration_days: number;
}

export interface PendingPayoutView {
  id: string;
  tenant_id: string;
  transaction_id?: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  tenant_name: string;
  current_commission_rate?: number;
  bank_details?: Record<string, any>;
  transaction_amount?: number;
  gateway?: PaymentGateway;
}
