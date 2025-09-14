
export type PaymentGatewayType = 'stripe' | 'paypal' | 'razorpay' | 'cash_mode';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';

export interface PaymentGateway {
  id: string;
  gateway_type: PaymentGatewayType;
  name: string;
  display_name: string;
  description?: string;
  is_active: boolean;
  configuration: Record<string, any>;
  supported_currencies: string[];
  webhook_url?: string;
  created_at: string;
  updated_at: string;
}

export interface TenantPaymentConfig {
  id: string;
  tenant_id: string;
  gateway_type: PaymentGatewayType;
  is_active: boolean;
  is_primary: boolean;
  api_keys: Record<string, string>;
  webhook_secret?: string;
  configuration: Record<string, any>;
  last_validated_at?: string;
  validation_status: string;
  validation_error?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: string;
  tenant_id: string;
  gateway_type: PaymentGatewayType;
  external_transaction_id?: string;
  payment_intent_id?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method?: string;
  customer_id?: string;
  subscription_id?: string;
  invoice_id?: string;
  description?: string;
  metadata: Record<string, any>;
  gateway_response: Record<string, any>;
  webhook_data: Record<string, any>;
  processed_at?: string;
  failed_at?: string;
  failure_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentGatewayCredentials {
  stripe?: {
    publishable_key: string;
    secret_key: string;
    webhook_secret?: string;
  };
  paypal?: {
    client_id: string;
    client_secret: string;
    webhook_id?: string;
  };
  razorpay?: {
    key_id: string;
    key_secret: string;
    webhook_secret?: string;
  };
}

export interface CreatePaymentRequest {
  amount: number;
  currency: string;
  description?: string;
  customer_email?: string;
  metadata?: Record<string, any>;
  return_url?: string;
  cancel_url?: string;
}

export interface PaymentResult {
  success: boolean;
  transaction_id?: string;
  payment_url?: string;
  error?: string;
  gateway_response?: Record<string, any>;
}
