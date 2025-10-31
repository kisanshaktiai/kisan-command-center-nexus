import type { IPaymentGateway, PaymentGatewayType } from '@/types/billing/payment-gateway';
import { VirtualGateway } from './VirtualGateway';
import { RazorpayGateway } from './RazorpayGateway';
import { StripeGateway } from './StripeGateway';

/**
 * Factory for creating payment gateway instances
 * Handles gateway selection based on configuration
 */
export class PaymentGatewayFactory {
  private static instance: PaymentGatewayFactory;
  private gateways: Map<PaymentGatewayType, IPaymentGateway> = new Map();
  private defaultGateway: PaymentGatewayType = 'virtual';

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): PaymentGatewayFactory {
    if (!PaymentGatewayFactory.instance) {
      PaymentGatewayFactory.instance = new PaymentGatewayFactory();
    }
    return PaymentGatewayFactory.instance;
  }

  /**
   * Initialize gateways with configuration
   */
  initialize(config: {
    defaultGateway?: PaymentGatewayType;
    razorpay?: { keyId: string; keySecret: string; webhookSecret?: string };
    stripe?: { secretKey: string; webhookSecret?: string };
  }): void {
    // Always initialize virtual gateway for testing
    this.gateways.set('virtual', new VirtualGateway());

    // Initialize Razorpay if credentials provided
    if (config.razorpay?.keyId && config.razorpay?.keySecret) {
      this.gateways.set('razorpay', new RazorpayGateway(config.razorpay));
      console.log('✅ Razorpay gateway initialized');
    }

    // Initialize Stripe if credentials provided
    if (config.stripe?.secretKey) {
      this.gateways.set('stripe', new StripeGateway(config.stripe));
      console.log('✅ Stripe gateway initialized');
    }

    // Set default gateway
    if (config.defaultGateway && this.gateways.has(config.defaultGateway)) {
      this.defaultGateway = config.defaultGateway;
      console.log(`✅ Default gateway set to: ${config.defaultGateway}`);
    } else {
      console.log('ℹ️ Using virtual gateway as default (test mode)');
    }
  }

  /**
   * Get gateway instance by type
   */
  getGateway(type?: PaymentGatewayType): IPaymentGateway {
    const gatewayType = type || this.defaultGateway;
    const gateway = this.gateways.get(gatewayType);

    if (!gateway) {
      console.warn(`Gateway ${gatewayType} not initialized, falling back to virtual gateway`);
      return this.gateways.get('virtual')!;
    }

    return gateway;
  }

  /**
   * Get default gateway
   */
  getDefaultGateway(): IPaymentGateway {
    return this.getGateway(this.defaultGateway);
  }

  /**
   * Check if gateway is available
   */
  isGatewayAvailable(type: PaymentGatewayType): boolean {
    return this.gateways.has(type);
  }

  /**
   * Get list of available gateways
   */
  getAvailableGateways(): PaymentGatewayType[] {
    return Array.from(this.gateways.keys());
  }

  /**
   * Get current default gateway type
   */
  getDefaultGatewayType(): PaymentGatewayType {
    return this.defaultGateway;
  }

  /**
   * Set default gateway
   */
  setDefaultGateway(type: PaymentGatewayType): void {
    if (this.gateways.has(type)) {
      this.defaultGateway = type;
      console.log(`✅ Default gateway changed to: ${type}`);
    } else {
      throw new Error(`Gateway ${type} is not available`);
    }
  }
}

// Export singleton instance
export const paymentGatewayFactory = PaymentGatewayFactory.getInstance();
