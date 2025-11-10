# 🚀 Phase 3: Payment Gateway Abstraction Layer

**Status:** ✅ Complete

---

## 📦 Architecture Overview

Created a **unified payment gateway abstraction** that supports:
- 🟢 **Virtual Gateway** (Development/Testing - Auto-approves all payments)
- 🔵 **Razorpay Gateway** (Production - India)
- 🟣 **Stripe Gateway** (Production - Global)

---

## 🏗️ Class Structure

```
IPaymentGateway (Interface)
    ↓
BasePaymentGateway (Abstract Base Class)
    ├── VirtualGateway
    ├── RazorpayGateway
    └── StripeGateway
```

All gateways implement the same interface:
- `createOrder()` - Create payment order/intent
- `verifyPayment()` - Verify payment success
- `refund()` - Process refunds
- `getPaymentStatus()` - Check payment status

---

## 📁 Files Created

### Core Gateway Implementation
- ✅ `src/types/billing/payment-gateway.ts` - TypeScript interfaces
- ✅ `src/services/payment-gateway/BasePaymentGateway.ts` - Abstract base class
- ✅ `src/services/payment-gateway/VirtualGateway.ts` - Test/dev gateway
- ✅ `src/services/payment-gateway/RazorpayGateway.ts` - Razorpay integration
- ✅ `src/services/payment-gateway/StripeGateway.ts` - Stripe integration
- ✅ `src/services/payment-gateway/PaymentGatewayFactory.ts` - Factory pattern
- ✅ `src/services/payment-gateway/index.ts` - Central export
- ✅ `src/config/payment-gateway.config.ts` - Configuration loader

---

## 🔄 Virtual Gateway (Test Mode)

**Features:**
- Auto-generates fake transaction IDs: `VIRT-TXN-{timestamp}-{random}`
- Always returns `success` for all payments
- Stores mock data in-memory
- Supports refund simulation
- Perfect for development and testing

**Example Transaction ID:**
```
VIRT-TXN-1699847362123-AB5CD9EF
```

---

## 🇮🇳 Razorpay Gateway

**Features:**
- Indian payment gateway (UPI, Cards, Netbanking)
- INR currency support
- Amount in paise (₹1 = 100 paise)
- Signature verification for security
- Webhook support

**Required Credentials:**
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET` (optional)

---

## 🌍 Stripe Gateway

**Features:**
- Global payment gateway
- Multi-currency support
- Payment Intents API
- Automatic fraud detection
- Webhook support

**Required Credentials:**
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (optional)

---

## 🎯 Factory Pattern Usage

```typescript
import { paymentGatewayFactory } from '@/services/payment-gateway';

// Initialize on app startup
paymentGatewayFactory.initialize({
  defaultGateway: 'virtual', // 'virtual', 'razorpay', or 'stripe'
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
  },
});

// Get gateway instance
const gateway = paymentGatewayFactory.getGateway('razorpay');

// Use gateway
const order = await gateway.createOrder({
  amount: 599.00,
  currency: 'INR',
  metadata: { farmerId: '123', planId: 'pro-monthly' },
});
```

---

## ⚙️ Environment Configuration

**Development:**
- Gateway: `virtual`
- All payments auto-approved
- No real credentials needed

**Staging:**
- Gateway: `virtual` or sandbox Razorpay/Stripe
- Test with real gateway flows
- Use sandbox credentials

**Production:**
- Gateway: `razorpay` (India) or `stripe` (Global)
- Real payment processing
- Live credentials required

---

## 🔐 Environment Variables

Create these in Supabase Edge Function secrets (not in frontend):

```env
# Default Gateway Selection
PAYMENT_GATEWAY=virtual  # or razorpay, stripe

# Razorpay (for India)
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxx

# Stripe (for Global)
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

---

## 📊 Payment Flow Example

### 1. Create Order (Farmer purchases subscription)
```typescript
const gateway = paymentGatewayFactory.getGateway('razorpay');

const orderResult = await gateway.createOrder({
  amount: 599.00,
  currency: 'INR',
  customerEmail: 'farmer@example.com',
  metadata: {
    farmerId: 'f-123',
    planId: 'plan-456',
    tenantId: 't-789',
  },
});

// Result:
// {
//   success: true,
//   orderId: 'order_xyz123',
//   paymentUrl: 'https://...' (for redirect)
// }
```

### 2. Verify Payment (After payment completion)
```typescript
const verifyResult = await gateway.verifyPayment({
  orderId: 'order_xyz123',
  paymentId: 'pay_abc456',
  signature: 'signature_from_razorpay',
});

// Result:
// {
//   success: true,
//   verified: true,
//   transactionId: 'pay_abc456',
//   status: 'success',
//   amount: 599.00,
//   currency: 'INR',
// }
```

### 3. Record in Database
```typescript
// Insert into transactions table
await supabase.from('transactions').insert({
  subscription_id: subscriptionId,
  tenant_id: tenantId,
  farmer_id: farmerId,
  gateway: 'razorpay',
  gateway_txn_id: verifyResult.transactionId,
  amount: 599.00,
  currency: 'INR',
  status: 'success',
  virtual_mode: false,
});

// Calculate and record payout
const commissionRate = tenant.commission_rate;
const payoutAmount = 599.00 * (commissionRate / 100);

await supabase.from('payouts').insert({
  tenant_id: tenantId,
  transaction_id: transactionId,
  amount: payoutAmount,
  commission_rate: commissionRate,
  status: 'pending',
});
```

### 4. Refund (if needed)
```typescript
const refundResult = await gateway.refund({
  transactionId: 'pay_abc456',
  amount: 599.00, // Optional, omit for full refund
  reason: 'Customer requested refund',
});

// Result:
// {
//   success: true,
//   refundId: 'rfnd_xyz789',
//   refundedAmount: 599.00,
// }
```

---

## 🔒 Security Features

1. **Signature Verification** (Razorpay)
   - Verifies webhook authenticity
   - Prevents payment tampering

2. **Credential Management**
   - Stored in Supabase secrets
   - Never exposed to frontend
   - Used only in edge functions

3. **Transaction Logging**
   - All operations logged
   - Gateway responses stored
   - Audit trail maintained

---

## 🧪 Testing Guide

### Virtual Gateway Testing
```typescript
// Test successful payment
const gateway = new VirtualGateway();
const order = await gateway.createOrder({ amount: 100, currency: 'INR' });
const verify = await gateway.verifyPayment({ 
  orderId: order.orderId, 
  paymentId: 'test-payment-1' 
});
// verify.success === true, verify.status === 'success'

// Test refund
const refund = await gateway.refund({ 
  transactionId: 'VIRT-TXN-xyz',
  amount: 100 
});
// refund.success === true
```

---

## 📈 Gateway Comparison

| Feature | Virtual | Razorpay | Stripe |
|---------|---------|----------|--------|
| **Best For** | Testing | India | Global |
| **Currency** | Any | INR primarily | 135+ currencies |
| **Payment Methods** | N/A | UPI, Cards, NB | Cards, Wallets |
| **Auto-approval** | ✅ Yes | ❌ No | ❌ No |
| **Real Money** | ❌ No | ✅ Yes | ✅ Yes |
| **Setup Time** | Instant | 1-2 days KYC | Few hours |
| **Transaction Fee** | Free | 2% + GST | 2.9% + $0.30 |

---

## 🎯 Next Steps (Phase 4)

**Integration Points:**
- ✅ Admin Workspace - Gateway management UI
- ✅ Tenant Portal - Revenue/payout reports
- ✅ Farmer Portal - Subscription purchase flow
- ✅ Edge Functions - Payment webhooks
- ✅ Payout Automation - Scheduled settlements

**Status:** Ready for Phase 4 implementation 🚀
