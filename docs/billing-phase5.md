# Phase 5: Webhook Management, Auto-Renewals & Analytics

## Overview
Phase 5 completes the billing system with webhook handlers for real-time payment notifications, automated subscription renewals, and comprehensive analytics dashboards.

## Components Implemented

### 1. Webhook Handlers

#### Razorpay Webhook (`razorpay-webhook`)
- **Location**: `supabase/functions/razorpay-webhook/index.ts`
- **Purpose**: Handles Razorpay payment events
- **Features**:
  - Signature verification using HMAC-SHA256
  - Event handling for:
    - `payment.captured` - Payment successful
    - `payment.failed` - Payment failed
    - `order.paid` - Order completed
    - `subscription.charged` - Recurring charge
    - `subscription.completed` - Subscription ended
    - `subscription.cancelled` - Subscription cancelled
  - Automatic transaction and subscription status updates
  - Payout creation for successful payments

#### Stripe Webhook (`stripe-webhook-handler`)
- **Location**: `supabase/functions/stripe-webhook-handler/index.ts`
- **Purpose**: Handles Stripe payment events
- **Features**:
  - Built-in Stripe webhook signature verification
  - Event handling for:
    - `payment_intent.succeeded` - Payment successful
    - `payment_intent.payment_failed` - Payment failed
    - `charge.succeeded` / `charge.failed` - Charge events
    - `customer.subscription.*` - Subscription lifecycle
    - `invoice.paid` / `invoice.payment_failed` - Invoice events
  - Automatic status synchronization
  - Transaction recording for completed payments

### 2. Auto-Renewal System

#### Process Renewals Function (`process-renewals`)
- **Location**: `supabase/functions/process-renewals/index.ts`
- **Purpose**: Automatically renew expiring subscriptions
- **Features**:
  - Finds subscriptions expiring in the next 3 days
  - Checks auto-renewal preferences
  - Creates renewal transactions
  - Processes payments (virtual mode auto-approved)
  - Extends subscription periods
  - Calculates and creates tenant payouts
  - Comprehensive error handling and logging
  - Returns detailed processing results

**Cron Setup** (Recommended):
```sql
-- Run daily at midnight
SELECT cron.schedule(
  'process-subscription-renewals',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/process-renewals',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
```

### 3. Analytics System

#### Billing Analytics Hook (`useBillingAnalytics`)
- **Location**: `src/hooks/useBillingAnalytics.ts`
- **Purpose**: Comprehensive billing metrics calculation
- **Metrics Provided**:

**Revenue Metrics**:
- Total revenue
- Monthly revenue
- Daily revenue
- 30-day trend data

**Subscription Metrics**:
- Total subscriptions
- Active/Cancelled/Expired counts
- Churn rate calculation
- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)

**Transaction Metrics**:
- Total transactions
- Completed/Failed/Pending counts
- Success rate percentage
- Average transaction value

**Payout Metrics**:
- Total payouts
- Status breakdown
- Total payout amount

**Farmer Metrics**:
- Total farmers
- Subscribed farmers count
- Conversion rate

#### Advanced Analytics Dashboard
- **Location**: `src/components/billing/AdvancedAnalyticsDashboard.tsx`
- **Features**:
  - Key metric cards with icons
  - Revenue trend line chart (30 days)
  - Subscription status pie chart
  - Transaction status bar chart
  - Farmer conversion metrics
  - Average transaction value
  - Pending payouts summary
  - Auto-refresh every 5 minutes
  - Date range filtering support

### 4. Webhook Management UI

#### Webhook Manager Component
- **Location**: `src/components/billing/WebhookManager.tsx`
- **Features**:
  - Displays webhook URLs for each gateway
  - One-click URL copying
  - Setup instructions for each gateway
  - Supported events display
  - Test webhook functionality
  - Environment variable requirements
  - Visual status indicators

## Setup Instructions

### 1. Webhook Configuration

#### Razorpay Setup:
1. Go to Razorpay Dashboard → Settings → Webhooks
2. Click "Create Webhook"
3. Use URL: `https://your-project.supabase.co/functions/v1/razorpay-webhook`
4. Select events: payment, order, subscription
5. Generate webhook secret
6. Add to Supabase: `RAZORPAY_WEBHOOK_SECRET`

#### Stripe Setup:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Use URL: `https://your-project.supabase.co/functions/v1/stripe-webhook-handler`
4. Select events: payment_intent, charge, customer.subscription, invoice
5. Copy signing secret
6. Add to Supabase: `STRIPE_WEBHOOK_SECRET`

### 2. Environment Variables

Add to Supabase Project Settings → Edge Functions:

```bash
# Razorpay
RAZORPAY_KEY_ID=rzp_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx

# Stripe
STRIPE_SECRET_KEY=sk_xxx
STRIPE_PUBLISHABLE_KEY=pk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### 3. Auto-Renewal Setup

Enable pg_cron extension:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

Create cron job (see cron setup above).

### 4. Analytics Integration

Add to admin dashboard:
```tsx
import { AdvancedAnalyticsDashboard } from '@/components/billing/AdvancedAnalyticsDashboard';

<AdvancedAnalyticsDashboard 
  dateRange={{ 
    start: '2024-01-01', 
    end: '2024-12-31' 
  }} 
/>
```

## Testing

### Test Webhooks:
```bash
# Razorpay
curl -X POST https://your-project.supabase.co/functions/v1/razorpay-webhook \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: test_signature" \
  -d '{"event": "payment.captured", "payload": {...}}'

# Stripe
curl -X POST https://your-project.supabase.co/functions/v1/stripe-webhook-handler \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test_signature" \
  -d '{"type": "payment_intent.succeeded", "data": {...}}'
```

### Test Auto-Renewals:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/process-renewals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Security Considerations

1. **Webhook Signatures**: Always verify signatures to prevent unauthorized requests
2. **HTTPS Only**: Webhooks must use HTTPS in production
3. **Secret Management**: Store all secrets in Supabase, never in code
4. **Idempotency**: Webhooks may be sent multiple times, handle duplicates
5. **Rate Limiting**: Implement rate limiting for webhook endpoints
6. **Logging**: Log all webhook events for audit trails

## Monitoring

### Key Metrics to Monitor:
- Webhook success/failure rates
- Auto-renewal success rates
- Payment success rates
- Average transaction values
- Churn rate trends
- MRR/ARR growth

### Error Handling:
- Failed webhooks logged in edge function logs
- Failed renewals update subscription status
- Analytics gracefully handles missing data
- Retry logic for transient failures

## Next Steps

### Production Readiness:
1. Enable real payment gateways (Razorpay/Stripe)
2. Configure production webhook URLs
3. Set up monitoring and alerting
4. Test end-to-end payment flows
5. Implement retry queues for failed payments
6. Add email notifications for payment events
7. Set up backup and disaster recovery

### Enhancements:
1. Multi-currency support with exchange rates
2. Advanced payment routing
3. Dunning management for failed payments
4. Subscription upgrade/downgrade flows
5. Prorated billing
6. Usage-based billing
7. Custom billing cycles
8. Invoice generation and delivery

## Conclusion

Phase 5 completes the core billing system with:
- ✅ Real-time payment notifications via webhooks
- ✅ Automated subscription renewals
- ✅ Comprehensive analytics and reporting
- ✅ Webhook management UI
- ✅ Production-ready architecture

The system is now ready for production deployment with proper configuration of payment gateways and environment variables.
