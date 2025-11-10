import type {
  IPaymentGateway,
  PaymentGatewayType,
  CreateOrderRequest,
  CreateOrderResponse,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
  RefundRequest,
  RefundResponse,
  PaymentStatus,
} from '@/types/billing/payment-gateway';

/**
 * Abstract base class for payment gateway implementations
 * All gateway classes should extend this
 */
export abstract class BasePaymentGateway implements IPaymentGateway {
  abstract readonly type: PaymentGatewayType;
  abstract readonly name: string;
  
  protected config: Record<string, any>;

  constructor(config: Record<string, any> = {}) {
    this.config = config;
  }

  /**
   * Create a payment order/intent
   */
  abstract createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse>;

  /**
   * Verify payment completion and signature
   */
  abstract verifyPayment(request: VerifyPaymentRequest): Promise<VerifyPaymentResponse>;

  /**
   * Process refund for a transaction
   */
  abstract refund(request: RefundRequest): Promise<RefundResponse>;

  /**
   * Get current payment status
   */
  abstract getPaymentStatus(transactionId: string): Promise<PaymentStatus>;

  /**
   * Validate gateway configuration
   */
  protected validateConfig(requiredFields: string[]): void {
    const missing = requiredFields.filter(field => !this.config[field]);
    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }
  }

  /**
   * Log gateway operation (can be overridden)
   */
  protected log(level: 'info' | 'error' | 'warn', message: string, data?: any): void {
    const logData = {
      gateway: this.type,
      timestamp: new Date().toISOString(),
      message,
      ...(data && { data })
    };
    
    if (level === 'error') {
      console.error(`[${this.name}]`, logData);
    } else if (level === 'warn') {
      console.warn(`[${this.name}]`, logData);
    } else {
      console.log(`[${this.name}]`, logData);
    }
  }
}
