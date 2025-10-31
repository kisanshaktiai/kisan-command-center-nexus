// Payment Gateway Abstraction Types

export type PaymentGatewayType = 'virtual' | 'razorpay' | 'stripe';

export interface PaymentGatewayConfig {
  type: PaymentGatewayType;
  isEnabled: boolean;
  credentials?: {
    apiKey?: string;
    apiSecret?: string;
    webhookSecret?: string;
  };
}

export interface CreateOrderRequest {
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
  customerId?: string;
  customerEmail?: string;
  customerPhone?: string;
  description?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface CreateOrderResponse {
  success: boolean;
  orderId: string;
  paymentUrl?: string;
  gatewayResponse?: Record<string, any>;
  error?: string;
}

export interface VerifyPaymentRequest {
  orderId: string;
  paymentId: string;
  signature?: string;
  gatewayResponse?: Record<string, any>;
}

export interface VerifyPaymentResponse {
  success: boolean;
  verified: boolean;
  transactionId: string;
  amount?: number;
  currency?: string;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'refunded';
  gatewayResponse?: Record<string, any>;
  error?: string;
}

export interface RefundRequest {
  transactionId: string;
  amount?: number; // If null, full refund
  reason?: string;
}

export interface RefundResponse {
  success: boolean;
  refundId: string;
  refundedAmount: number;
  gatewayResponse?: Record<string, any>;
  error?: string;
}

export interface PaymentStatus {
  transactionId: string;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'refunded';
  amount: number;
  currency: string;
  gatewayResponse?: Record<string, any>;
}

// Abstract payment gateway interface
export interface IPaymentGateway {
  readonly type: PaymentGatewayType;
  readonly name: string;
  
  createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse>;
  verifyPayment(request: VerifyPaymentRequest): Promise<VerifyPaymentResponse>;
  refund(request: RefundRequest): Promise<RefundResponse>;
  getPaymentStatus(transactionId: string): Promise<PaymentStatus>;
}
