import type { PaymentGatewayType } from '@/types/billing/payment-gateway';

/**
 * Payment Gateway Configuration
 * 
 * Environment Variables:
 * - PAYMENT_GATEWAY: Default gateway to use (virtual, razorpay, stripe)
 * - RAZORPAY_KEY_ID: Razorpay Key ID
 * - RAZORPAY_KEY_SECRET: Razorpay Key Secret
 * - RAZORPAY_WEBHOOK_SECRET: Razorpay Webhook Secret
 * - STRIPE_SECRET_KEY: Stripe Secret Key
 * - STRIPE_WEBHOOK_SECRET: Stripe Webhook Secret
 */

export interface PaymentGatewayConfig {
  defaultGateway: PaymentGatewayType;
  enableVirtual: boolean;
  razorpay?: {
    keyId: string;
    keySecret: string;
    webhookSecret?: string;
  };
  stripe?: {
    secretKey: string;
    webhookSecret?: string;
  };
}

/**
 * Get payment gateway configuration from environment
 * Defaults to virtual gateway for development
 */
export function getPaymentGatewayConfig(): PaymentGatewayConfig {
  // Default to virtual for local development
  const defaultGateway = (import.meta.env.VITE_PAYMENT_GATEWAY || 'virtual') as PaymentGatewayType;
  
  const config: PaymentGatewayConfig = {
    defaultGateway,
    enableVirtual: true, // Always enable virtual for testing
  };

  // Razorpay configuration (will be loaded from Supabase secrets in edge functions)
  const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
  const razorpayKeySecret = import.meta.env.VITE_RAZORPAY_KEY_SECRET;
  
  if (razorpayKeyId && razorpayKeySecret) {
    config.razorpay = {
      keyId: razorpayKeyId,
      keySecret: razorpayKeySecret,
      webhookSecret: import.meta.env.VITE_RAZORPAY_WEBHOOK_SECRET,
    };
  }

  // Stripe configuration (will be loaded from Supabase secrets in edge functions)
  const stripeSecretKey = import.meta.env.VITE_STRIPE_SECRET_KEY;
  
  if (stripeSecretKey) {
    config.stripe = {
      secretKey: stripeSecretKey,
      webhookSecret: import.meta.env.VITE_STRIPE_WEBHOOK_SECRET,
    };
  }

  return config;
}

/**
 * Environment-based gateway selection helper
 */
export function getGatewayForEnvironment(): PaymentGatewayType {
  const env = import.meta.env.MODE;
  
  switch (env) {
    case 'development':
      return 'virtual';
    case 'staging':
      return 'virtual'; // Or use sandbox Razorpay/Stripe
    case 'production':
      // Check if Razorpay is configured (preferred for India)
      if (import.meta.env.VITE_RAZORPAY_KEY_ID) {
        return 'razorpay';
      }
      // Fall back to Stripe if available
      if (import.meta.env.VITE_STRIPE_SECRET_KEY) {
        return 'stripe';
      }
      // Default to virtual if nothing configured
      return 'virtual';
    default:
      return 'virtual';
  }
}

/**
 * Check if real payment gateways are configured
 */
export function hasRealGatewayConfigured(): boolean {
  return !!(
    (import.meta.env.VITE_RAZORPAY_KEY_ID && import.meta.env.VITE_RAZORPAY_KEY_SECRET) ||
    import.meta.env.VITE_STRIPE_SECRET_KEY
  );
}
