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
 * Virtual/Dummy payment gateway for development and testing
 * Auto-approves all payments with fake transaction IDs
 */
export class VirtualGateway extends BasePaymentGateway {
  readonly type: PaymentGatewayType = 'virtual';
  readonly name = 'Virtual Gateway (Test Mode)';

  private mockDatabase: Map<string, any> = new Map();

  async createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    this.log('info', 'Creating virtual order', request);

    // Generate fake order ID
    const orderId = `VIRT-ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Store order data in mock database
    this.mockDatabase.set(orderId, {
      orderId,
      amount: request.amount,
      currency: request.currency,
      status: 'created',
      createdAt: new Date().toISOString(),
      metadata: request.metadata,
      customerId: request.customerId,
    });

    this.log('info', 'Virtual order created', { orderId });

    return {
      success: true,
      orderId,
      paymentUrl: `/payment/virtual/${orderId}`, // Mock payment page
      gatewayResponse: {
        mode: 'test',
        orderDetails: this.mockDatabase.get(orderId),
      },
    };
  }

  async verifyPayment(request: VerifyPaymentRequest): Promise<VerifyPaymentResponse> {
    this.log('info', 'Verifying virtual payment', request);

    const order = this.mockDatabase.get(request.orderId);
    
    if (!order) {
      return {
        success: false,
        verified: false,
        transactionId: '',
        status: 'failed',
        error: 'Order not found',
      };
    }

    // Generate fake transaction ID
    const transactionId = `VIRT-TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Update mock database
    order.status = 'success';
    order.transactionId = transactionId;
    order.paymentId = request.paymentId;
    order.completedAt = new Date().toISOString();
    this.mockDatabase.set(request.orderId, order);

    this.log('info', 'Virtual payment verified (auto-approved)', { transactionId });

    return {
      success: true,
      verified: true,
      transactionId,
      amount: order.amount,
      currency: order.currency,
      status: 'success',
      gatewayResponse: {
        mode: 'test',
        autoApproved: true,
        orderDetails: order,
      },
    };
  }

  async refund(request: RefundRequest): Promise<RefundResponse> {
    this.log('info', 'Processing virtual refund', request);

    // Find transaction
    let order: any = null;
    for (const [key, value] of this.mockDatabase.entries()) {
      if (value.transactionId === request.transactionId) {
        order = value;
        break;
      }
    }

    if (!order) {
      return {
        success: false,
        refundId: '',
        refundedAmount: 0,
        error: 'Transaction not found',
      };
    }

    const refundAmount = request.amount ?? order.amount;
    const refundId = `VIRT-RFD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Update mock database
    order.status = 'refunded';
    order.refundId = refundId;
    order.refundedAmount = refundAmount;
    order.refundedAt = new Date().toISOString();
    order.refundReason = request.reason;

    this.log('info', 'Virtual refund processed (auto-approved)', { refundId });

    return {
      success: true,
      refundId,
      refundedAmount: refundAmount,
      gatewayResponse: {
        mode: 'test',
        autoApproved: true,
        refundDetails: {
          refundId,
          amount: refundAmount,
          currency: order.currency,
        },
      },
    };
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentStatus> {
    this.log('info', 'Getting virtual payment status', { transactionId });

    // Find transaction
    let order: any = null;
    for (const [key, value] of this.mockDatabase.entries()) {
      if (value.transactionId === transactionId) {
        order = value;
        break;
      }
    }

    if (!order) {
      throw new Error('Transaction not found');
    }

    return {
      transactionId,
      status: order.status,
      amount: order.amount,
      currency: order.currency,
      gatewayResponse: {
        mode: 'test',
        orderDetails: order,
      },
    };
  }

  /**
   * Simulate payment failure (for testing)
   */
  async simulateFailure(orderId: string, reason: string): Promise<void> {
    const order = this.mockDatabase.get(orderId);
    if (order) {
      order.status = 'failed';
      order.failureReason = reason;
      order.failedAt = new Date().toISOString();
      this.log('warn', 'Virtual payment failed (simulated)', { orderId, reason });
    }
  }

  /**
   * Clear mock database (for testing)
   */
  clearMockData(): void {
    this.mockDatabase.clear();
    this.log('info', 'Virtual gateway mock data cleared');
  }
}
