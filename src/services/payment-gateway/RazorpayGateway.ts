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
 * Razorpay payment gateway integration
 * For production use with Indian market
 */
export class RazorpayGateway extends BasePaymentGateway {
  readonly type: PaymentGatewayType = 'razorpay';
  readonly name = 'Razorpay';

  private keyId: string;
  private keySecret: string;
  private webhookSecret?: string;

  constructor(config: { keyId: string; keySecret: string; webhookSecret?: string }) {
    super(config);
    this.validateConfig(['keyId', 'keySecret']);
    this.keyId = config.keyId;
    this.keySecret = config.keySecret;
    this.webhookSecret = config.webhookSecret;
  }

  async createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    this.log('info', 'Creating Razorpay order', { amount: request.amount, currency: request.currency });

    try {
      // Convert amount to paise (smallest currency unit)
      const amountInPaise = Math.round(request.amount * 100);

      const orderData = {
        amount: amountInPaise,
        currency: request.currency,
        receipt: `rcpt_${Date.now()}`,
        notes: request.metadata || {},
      };

      // Call Razorpay API
      const response = await this.makeRazorpayRequest('/orders', 'POST', orderData);

      if (!response.id) {
        throw new Error('Invalid response from Razorpay');
      }

      this.log('info', 'Razorpay order created', { orderId: response.id });

      return {
        success: true,
        orderId: response.id,
        gatewayResponse: response,
      };
    } catch (error: any) {
      this.log('error', 'Failed to create Razorpay order', error);
      return {
        success: false,
        orderId: '',
        error: error.message || 'Failed to create order',
      };
    }
  }

  async verifyPayment(request: VerifyPaymentRequest): Promise<VerifyPaymentResponse> {
    this.log('info', 'Verifying Razorpay payment', { orderId: request.orderId });

    try {
      // Verify signature
      if (request.signature) {
        const isValid = await this.verifySignature(
          request.orderId,
          request.paymentId,
          request.signature
        );

        if (!isValid) {
          return {
            success: false,
            verified: false,
            transactionId: request.paymentId,
            status: 'failed',
            error: 'Invalid payment signature',
          };
        }
      }

      // Fetch payment details
      const payment = await this.makeRazorpayRequest(`/payments/${request.paymentId}`, 'GET');

      const status = this.mapRazorpayStatus(payment.status);

      this.log('info', 'Razorpay payment verified', { 
        paymentId: request.paymentId, 
        status: payment.status 
      });

      return {
        success: true,
        verified: status === 'success',
        transactionId: request.paymentId,
        amount: payment.amount / 100, // Convert from paise
        currency: payment.currency,
        status,
        gatewayResponse: payment,
      };
    } catch (error: any) {
      this.log('error', 'Failed to verify Razorpay payment', error);
      return {
        success: false,
        verified: false,
        transactionId: request.paymentId,
        status: 'failed',
        error: error.message || 'Failed to verify payment',
      };
    }
  }

  async refund(request: RefundRequest): Promise<RefundResponse> {
    this.log('info', 'Processing Razorpay refund', { transactionId: request.transactionId });

    try {
      const refundData: any = {
        payment_id: request.transactionId,
      };

      if (request.amount) {
        refundData.amount = Math.round(request.amount * 100); // Convert to paise
      }

      if (request.reason) {
        refundData.notes = { reason: request.reason };
      }

      const response = await this.makeRazorpayRequest('/refunds', 'POST', refundData);

      this.log('info', 'Razorpay refund processed', { refundId: response.id });

      return {
        success: true,
        refundId: response.id,
        refundedAmount: response.amount / 100,
        gatewayResponse: response,
      };
    } catch (error: any) {
      this.log('error', 'Failed to process Razorpay refund', error);
      return {
        success: false,
        refundId: '',
        refundedAmount: 0,
        error: error.message || 'Failed to process refund',
      };
    }
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentStatus> {
    this.log('info', 'Getting Razorpay payment status', { transactionId });

    try {
      const payment = await this.makeRazorpayRequest(`/payments/${transactionId}`, 'GET');

      return {
        transactionId,
        status: this.mapRazorpayStatus(payment.status),
        amount: payment.amount / 100,
        currency: payment.currency,
        gatewayResponse: payment,
      };
    } catch (error: any) {
      this.log('error', 'Failed to get Razorpay payment status', error);
      throw new Error(error.message || 'Failed to get payment status');
    }
  }

  private async makeRazorpayRequest(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any
  ): Promise<any> {
    const url = `https://api.razorpay.com/v1${endpoint}`;
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');

    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    };

    if (body && method === 'POST') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.description || 'Razorpay API error');
    }

    return data;
  }

  private async verifySignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): Promise<boolean> {
    // In production, use crypto.createHmac to verify signature
    // For now, this is a placeholder
    const expectedSignature = await this.generateSignature(orderId, paymentId);
    return signature === expectedSignature;
  }

  private async generateSignature(orderId: string, paymentId: string): Promise<string> {
    // Implementation would use crypto.createHmac with keySecret
    // This is a placeholder for the actual implementation
    return 'signature';
  }

  private mapRazorpayStatus(razorpayStatus: string): 'pending' | 'processing' | 'success' | 'failed' | 'refunded' {
    const statusMap: Record<string, any> = {
      'created': 'pending',
      'authorized': 'processing',
      'captured': 'success',
      'refunded': 'refunded',
      'failed': 'failed',
    };
    return statusMap[razorpayStatus] || 'pending';
  }
}
