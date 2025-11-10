// Payment Gateway Service - Central export point

export { BasePaymentGateway } from './BasePaymentGateway';
export { VirtualGateway } from './VirtualGateway';
export { RazorpayGateway } from './RazorpayGateway';
export { StripeGateway } from './StripeGateway';
export { PaymentGatewayFactory, paymentGatewayFactory } from './PaymentGatewayFactory';

export type {
  PaymentGatewayType,
  PaymentGatewayConfig,
  CreateOrderRequest,
  CreateOrderResponse,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
  RefundRequest,
  RefundResponse,
  PaymentStatus,
  IPaymentGateway,
} from '@/types/billing/payment-gateway';

/**
 * Usage Example:
 * 
 * // Initialize the factory (usually in app startup)
 * import { paymentGatewayFactory } from '@/services/payment-gateway';
 * 
 * paymentGatewayFactory.initialize({
 *   defaultGateway: 'virtual', // or 'razorpay', 'stripe'
 *   razorpay: {
 *     keyId: process.env.RAZORPAY_KEY_ID,
 *     keySecret: process.env.RAZORPAY_KEY_SECRET,
 *   },
 *   stripe: {
 *     secretKey: process.env.STRIPE_SECRET_KEY,
 *   },
 * });
 * 
 * // Use in components/services
 * const gateway = paymentGatewayFactory.getGateway('razorpay');
 * 
 * // Create order
 * const orderResult = await gateway.createOrder({
 *   amount: 599.00,
 *   currency: 'INR',
 *   metadata: { farmerId: '123', planId: 'pro' },
 * });
 * 
 * // Verify payment
 * const verifyResult = await gateway.verifyPayment({
 *   orderId: orderResult.orderId,
 *   paymentId: 'pay_xyz',
 *   signature: 'signature_abc',
 * });
 * 
 * // Process refund
 * const refundResult = await gateway.refund({
 *   transactionId: 'pay_xyz',
 *   amount: 599.00,
 *   reason: 'Customer requested',
 * });
 */
