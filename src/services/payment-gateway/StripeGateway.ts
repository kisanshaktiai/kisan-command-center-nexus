import { BasePaymentGateway } from './BasePaymentGateway';
import type {
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
 * Stripe payment gateway integration
 * For global payments
 */
export class StripeGateway extends BasePaymentGateway {
  readonly type: PaymentGatewayType = 'stripe';
  readonly name = 'Stripe';

  private secretKey: string;
  private webhookSecret?: string;

  constructor(config: { secretKey: string; webhookSecret?: string }) {
    super(config);
    this.validateConfig(['secretKey']);
    this.secretKey = config.secretKey;
    this.webhookSecret = config.webhookSecret;
  }

  async createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    this.log('info', 'Creating Stripe payment intent', { amount: request.amount, currency: request.currency });

    try {
      // Convert amount to smallest currency unit (cents for USD, paise for INR)
      const amountInCents = Math.round(request.amount * 100);

      const paymentIntentData: any = {
        amount: amountInCents,
        currency: request.currency.toLowerCase(),
        metadata: request.metadata || {},
        description: request.description,
      };

      if (request.customerId) {
        paymentIntentData.customer = request.customerId;
      }

      if (request.customerEmail) {
        paymentIntentData.receipt_email = request.customerEmail;
      }

      // Call Stripe API
      const response = await this.makeStripeRequest('/payment_intents', 'POST', paymentIntentData);

      if (!response.id) {
        throw new Error('Invalid response from Stripe');
      }

      this.log('info', 'Stripe payment intent created', { paymentIntentId: response.id });

      return {
        success: true,
        orderId: response.id,
        paymentUrl: response.client_secret ? `/payment/stripe/${response.id}` : undefined,
        gatewayResponse: {
          client_secret: response.client_secret,
          ...response,
        },
      };
    } catch (error: any) {
      this.log('error', 'Failed to create Stripe payment intent', error);
      return {
        success: false,
        orderId: '',
        error: error.message || 'Failed to create payment intent',
      };
    }
  }

  async verifyPayment(request: VerifyPaymentRequest): Promise<VerifyPaymentResponse> {
    this.log('info', 'Verifying Stripe payment', { paymentIntentId: request.orderId });

    try {
      // Fetch payment intent details
      const paymentIntent = await this.makeStripeRequest(
        `/payment_intents/${request.orderId}`,
        'GET'
      );

      const status = this.mapStripeStatus(paymentIntent.status);

      this.log('info', 'Stripe payment verified', { 
        paymentIntentId: request.orderId, 
        status: paymentIntent.status 
      });

      return {
        success: true,
        verified: status === 'success',
        transactionId: request.orderId,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        status,
        gatewayResponse: paymentIntent,
      };
    } catch (error: any) {
      this.log('error', 'Failed to verify Stripe payment', error);
      return {
        success: false,
        verified: false,
        transactionId: request.orderId,
        status: 'failed',
        error: error.message || 'Failed to verify payment',
      };
    }
  }

  async refund(request: RefundRequest): Promise<RefundResponse> {
    this.log('info', 'Processing Stripe refund', { paymentIntentId: request.transactionId });

    try {
      const refundData: any = {
        payment_intent: request.transactionId,
      };

      if (request.amount) {
        refundData.amount = Math.round(request.amount * 100);
      }

      if (request.reason) {
        refundData.reason = request.reason;
      }

      const response = await this.makeStripeRequest('/refunds', 'POST', refundData);

      this.log('info', 'Stripe refund processed', { refundId: response.id });

      return {
        success: true,
        refundId: response.id,
        refundedAmount: response.amount / 100,
        gatewayResponse: response,
      };
    } catch (error: any) {
      this.log('error', 'Failed to process Stripe refund', error);
      return {
        success: false,
        refundId: '',
        refundedAmount: 0,
        error: error.message || 'Failed to process refund',
      };
    }
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentStatus> {
    this.log('info', 'Getting Stripe payment status', { transactionId });

    try {
      const paymentIntent = await this.makeStripeRequest(
        `/payment_intents/${transactionId}`,
        'GET'
      );

      return {
        transactionId,
        status: this.mapStripeStatus(paymentIntent.status),
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        gatewayResponse: paymentIntent,
      };
    } catch (error: any) {
      this.log('error', 'Failed to get Stripe payment status', error);
      throw new Error(error.message || 'Failed to get payment status');
    }
  }

  private async makeStripeRequest(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any
  ): Promise<any> {
    const url = `https://api.stripe.com/v1${endpoint}`;

    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };

    if (body && method === 'POST') {
      // Convert to URL-encoded format
      const formBody = Object.keys(body)
        .map(key => {
          const value = typeof body[key] === 'object' 
            ? JSON.stringify(body[key]) 
            : body[key];
          return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
        })
        .join('&');
      options.body = formBody;
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Stripe API error');
    }

    return data;
  }

  private mapStripeStatus(stripeStatus: string): 'pending' | 'processing' | 'success' | 'failed' | 'refunded' {
    const statusMap: Record<string, any> = {
      'requires_payment_method': 'pending',
      'requires_confirmation': 'pending',
      'requires_action': 'processing',
      'processing': 'processing',
      'succeeded': 'success',
      'canceled': 'failed',
      'requires_capture': 'processing',
    };
    return statusMap[stripeStatus] || 'pending';
  }
}
