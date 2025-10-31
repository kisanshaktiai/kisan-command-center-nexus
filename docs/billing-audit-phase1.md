# 🔍 KisanShakti AI - Billing System Audit Report (Phase 1)

**Generated:** 2025-10-31  
**Status:** ✅ Complete

---

## 📊 Executive Summary

The current billing system has **14 billing-related tables** with:
- ✅ **Good:** Clean data integrity (no orphaned records in active tables)
- ⚠️ **Issue:** 4 global billing plans without tenant association
- ⚠️ **Issue:** Schema fragmentation across multiple tables
- ⚠️ **Critical:** No payment gateway abstraction layer
- ⚠️ **Critical:** No support for multiple gateways (Razorpay/Stripe/Virtual)
- ⚠️ **Critical:** Missing payout/commission tracking system
- ⚠️ **Critical:** Missing farmer-subscription linkage

---

## 🗄️ Current Database Schema Analysis

### 1. **billing_plans** ✅ Exists (Primary Plan Definition)
**Columns:**
- `id` (uuid, PK)
- `name` (varchar, required)
- `description` (text, nullable)
- `base_price` (numeric, default: 0)
- `price_monthly` (numeric, nullable)
- `price_quarterly` (numeric, nullable)
- `price_annually` (numeric, nullable)
- `billing_interval` (varchar, default: 'monthly')
- `features` (jsonb, default: {})
- `limits` (jsonb, default: {})
- `is_active` (boolean, default: true)
- `is_custom` (boolean, default: false)
- `tenant_id` (uuid, nullable) ⚠️
- `created_at`, `updated_at` (timestamps)

**Indexes:**
- `billing_plans_pkey` (PRIMARY KEY on id)
- `idx_billing_plans_active` (on is_active)
- `idx_billing_plans_tenant_id` (on tenant_id)

**Foreign Keys:**
- `billing_plans_tenant_id_fkey` → tenants(id)

**Data Summary:**
- Total Records: 4
- Orphaned (no tenant): 4 ⚠️ (Global plans)
- Inactive: 0

**Issues:**
- ⚠️ All 4 plans are orphaned (tenant_id = NULL) - likely global plans
- ❌ No `plan_type` column for categorization
- ❌ No `duration_days` field for subscription length
- ❌ No `currency` field (assumes single currency)

---

### 2. **tenant_subscriptions** ✅ Exists (Tenant-Level Subscriptions)
**Columns:**
- `id` (uuid, PK)
- `tenant_id` (uuid, required)
- `plan_id` (uuid, required) - References subscription_plans
- `status` (varchar: active/cancelled/expired/suspended/trial)
- `billing_cycle` (varchar: monthly/quarterly/annually)
- `current_period_start` (timestamp)
- `current_period_end` (timestamp)
- `trial_start`, `trial_end` (timestamps)
- `cancelled_at` (timestamp)
- `stripe_subscription_id` (text, unique)
- `stripe_customer_id` (text)
- `metadata` (jsonb)
- `created_at`, `updated_at`

**Indexes:**
- `tenant_subscriptions_pkey` (PRIMARY KEY)
- `idx_tenant_subscriptions_tenant_status` (tenant_id, status)
- `idx_tenant_subscriptions_status` (status)

**Foreign Keys:**
- `tenant_subscriptions_tenant_id_fkey` → tenants(id) ON DELETE CASCADE
- `tenant_subscriptions_plan_id_fkey` → subscription_plans(id)

**Data Summary:**
- Total Records: 0 (Empty)
- Orphaned: 0
- Inactive: 0

**Issues:**
- ⚠️ References `subscription_plans` table (not `billing_plans`) - schema inconsistency
- ❌ No link to farmer subscriptions
- ❌ Stripe-only (no Razorpay/Virtual gateway support)

---

### 3. **payment_records** ✅ Exists (Payment Tracking)
**Columns:**
- `id` (uuid, PK)
- `tenant_id` (uuid, required)
- `invoice_id` (uuid, nullable)
- `amount` (numeric, required)
- `currency` (text, default: 'USD')
- `payment_method` (text)
- `transaction_id` (text)
- `gateway_response` (jsonb)
- `status` (text: pending/completed/failed/refunded)
- `processed_at` (timestamp)
- `created_at`, `updated_at`

**Indexes:**
- `payment_records_pkey` (PRIMARY KEY)
- `idx_payment_records_tenant_status` (tenant_id, status)
- `idx_payment_records_status` (status)

**Foreign Keys:**
- `payment_records_tenant_id_fkey` → tenants(id) ON DELETE CASCADE
- `payment_records_invoice_id_fkey` → invoices(id)

**Data Summary:**
- Total Records: 0 (Empty)
- Orphaned: 0
- Failed: 0

**Issues:**
- ❌ No `subscription_id` foreign key
- ❌ No `gateway_type` field (razorpay/stripe/virtual)
- ❌ No `farmer_id` reference
- ❌ Currency defaults to 'USD' (should be 'INR' for India)

---

### 4. **payment_transactions** ✅ Exists (Detailed Transaction Log)
**Columns:**
- `id` (uuid, PK)
- `tenant_id` (uuid)
- `farmer_id` (uuid) ✅
- `invoice_id` (uuid)
- `subscription_id` (uuid)
- `type` (text: payment/refund/chargeback/credit)
- `status` (text: pending/processing/succeeded/failed/cancelled)
- `amount` (numeric, required)
- `currency` (text, default: 'INR') ✅
- `payment_method_id` (uuid)
- `stripe_payment_intent_id` (text)
- `stripe_charge_id` (text)
- `stripe_refund_id` (text)
- `failure_code`, `failure_message` (text)
- `processed_at` (timestamp)
- `metadata` (jsonb)
- `created_at`

**Indexes:**
- `payment_transactions_pkey` (PRIMARY KEY)
- `idx_payment_transactions_tenant_id` (tenant_id)
- `idx_payment_transactions_status` (status)

**Foreign Keys:**
- `payment_transactions_tenant_id_fkey` → tenants(id)
- `payment_transactions_invoice_id_fkey` → invoices(id)
- `payment_transactions_payment_method_id_fkey` → payment_methods(id)

**Data Summary:**
- Total Records: Not queried (likely empty)

**Issues:**
- ⚠️ Stripe-only fields (no Razorpay support)
- ❌ No gateway_type field
- ❌ No virtual_mode flag

---

### 5. **invoices** ✅ Exists (Invoice Management)
**Columns:**
- `id` (uuid, PK)
- `tenant_id` (uuid, required)
- `subscription_id` (uuid)
- `invoice_number` (text, unique, required)
- `amount` (numeric, required)
- `currency` (text, default: 'USD')
- `status` (text: draft/sent/paid/overdue/cancelled)
- `due_date` (date, required)
- `paid_date` (date)
- `stripe_invoice_id` (text)
- `paypal_invoice_id` (text)
- `line_items` (jsonb, default: [])
- `metadata` (jsonb)
- `created_at`, `updated_at`

**Indexes:**
- `invoices_pkey` (PRIMARY KEY)
- `idx_invoices_tenant_id` (tenant_id)
- `idx_invoices_tenant_status` (tenant_id, status)
- `idx_invoices_status`, `idx_invoices_due_date`

**Foreign Keys:**
- `invoices_tenant_id_fkey` → tenants(id) ON DELETE CASCADE
- `invoices_subscription_id_fkey` → tenant_subscriptions(id)

**Data Summary:**
- Total Records: 0 (Empty)

**Issues:**
- ❌ Currency defaults to 'USD' (should support INR)
- ❌ No Razorpay invoice ID field

---

### 6. **payments** ⚠️ Exists (Duplicate/Legacy?)
**Columns:**
- `id` (uuid, PK)
- `tenant_id` (uuid, required)
- `subscription_id` (uuid)
- `amount` (numeric, required)
- `currency` (varchar, default: 'USD')
- `payment_method` (jsonb)
- `payment_status` (varchar, default: 'pending')
- `payment_date`, `due_date` (timestamps)
- `invoice_number` (varchar)
- `transaction_id` (varchar)
- `gateway_response` (jsonb)
- `metadata` (jsonb)
- `created_at`, `updated_at`

**Issues:**
- ⚠️ **DUPLICATE TABLE** - overlaps with `payment_records` and `payment_transactions`
- **Recommendation:** Archive or merge with unified schema

---

### 7. **farmers** ✅ Exists (Farmer Data)
**Columns:**
- `id` (uuid, PK)
- `tenant_id` (uuid) ✅
- `farmer_code` (varchar, unique)
- `farmer_name` (text)
- `mobile_number` (varchar)
- `location` (text)
- `pin_hash`, `pin` (varchar) - Authentication
- `is_active` (boolean, default: true)
- `last_login_at` (timestamp)
- Farming data: `farm_type`, `total_land_acres`, `primary_crops`, etc.
- Seller profile: `store_name`, `seller_rating`, `total_sales`
- `created_at`, `updated_at`

**Indexes:**
- Multiple indexes on mobile_number, tenant_id combinations
- Full-text search index on farmer_name

**Foreign Keys:**
- No explicit subscription link ❌

**Data Summary:**
- Total Records: 4
- Without Tenant: 0 ✅
- Inactive: 0

**Issues:**
- ❌ Missing `subscription_id` field
- ❌ No link to plans or payment history

---

### 8. **tenants** ✅ Exists (B2B Tenant/Company)
**Columns:**
- `id` (uuid, PK)
- `name` (varchar)
- `slug`, `subdomain` (varchar, unique)
- `stripe_customer_id` (text, unique)
- `created_by`, `updated_by` (uuid) - FK to auth.users
- Timestamps

**Issues:**
- ❌ Missing commission/payout fields:
  - `commission_rate`
  - `payout_method`
  - `bank_details`
  - `kyc_status`

---

### 9. **subscription_renewals** ✅ Exists
**Columns:**
- `id`, `tenant_id`, `subscription_id`
- `renewal_date`, `amount`, `currency`
- `status` (pending/processing/completed/failed/cancelled)
- `stripe_subscription_id`, `paypal_subscription_id`
- `auto_renew`, `notification_sent`
- `processed_at`, `created_at`, `updated_at`

**Data Summary:**
- Empty table

---

### 10. **billing_analytics** ✅ Exists (Metrics Tracking)
**Columns:**
- `id`, `tenant_id`, `metric_date`
- `arr`, `mrr`, `ltv`, `churn_rate`
- `expansion_revenue`, `contraction_revenue`
- `active_subscriptions`, `new_subscriptions`, `cancelled_subscriptions`
- `payment_success_rate`, `average_revenue_per_user`
- `metadata`, `created_at`

**Indexes:**
- Not specified (needs indexing on tenant_id, metric_date)

---

### 11. **activation_codes** ✅ Exists (Offline Activation)
**Columns:**
- `id` (uuid, PK)
- `code` (varchar, required)
- `tenant_id` (uuid, required)
- `is_active` (boolean, default: true)
- `max_uses`, `used_count` (integer)
- `created_at`, `expires_at`, `last_used_at`
- `created_by` (uuid)
- `metadata` (jsonb)

**Foreign Keys:**
- `activation_codes_tenant_id_fkey` → tenants(id)

**Issues:**
- ❌ No `plan_id` field to link codes to specific plans
- ❌ No `redeemed_by` farmer tracking

---

### 12. **currency_rates** ✅ Exists (Exchange Rates)
**Columns:**
- `id`, `base_currency`, `target_currency`
- `rate`, `valid_from`, `valid_until`
- `source`, `created_at`, `updated_at`

**Data Summary:**
- Likely empty

---

### 13. **tenant_wallets** ⚠️ Exists (Not in Query)
### 14. **wallet_transactions** ⚠️ Exists (Not in Query)

---

## 🚨 Critical Missing Components

### ❌ 1. **Payment Gateway Abstraction**
- No unified gateway interface
- No `payment_gateways` table
- No `tenant_payment_configs` table
- All payment fields are Stripe-specific

### ❌ 2. **Farmer Subscription System**
- Farmers have no direct subscription tracking
- No `farmer_subscriptions` table
- Cannot track which plan a farmer is on

### ❌ 3. **Payout/Commission System**
- No `payouts` table
- No tenant commission tracking
- No settlement history

### ❌ 4. **Unified Subscription Plans**
- `billing_plans` and `subscription_plans` coexist (confusion)
- Missing `duration_days` field

### ❌ 5. **Multi-Gateway Support**
- No Razorpay integration
- No Virtual/Dummy gateway for testing
- No gateway selection logic

---

## 📋 Data Integrity Summary

| Table | Total Rows | Orphaned | Inactive/Failed | Status |
|-------|-----------|----------|----------------|--------|
| billing_plans | 4 | 4 (global) | 0 | ⚠️ Orphaned |
| tenant_subscriptions | 0 | 0 | 0 | ✅ Clean |
| payment_records | 0 | 0 | 0 | ✅ Clean |
| payment_transactions | Unknown | - | - | ⚠️ Not Analyzed |
| invoices | 0 | 0 | 0 | ✅ Clean |
| farmers | 4 | 0 | 0 | ✅ Clean |
| activation_codes | Unknown | - | - | ⚠️ Needs Plan Link |

**Conclusion:** No critical data corruption, but schema needs major refactoring.

---

## 🔧 Recommended Actions (Phase 2+)

### Immediate (Phase 2):
1. ✅ Create unified `plans` table (merge billing_plans + subscription_plans logic)
2. ✅ Add `subscriptions` table linking farmers → plans → payments
3. ✅ Create `transactions` table with gateway_type field
4. ✅ Add `payouts` table for tenant settlements
5. ✅ Update `activation_codes` with plan_id and redeemed_by

### Medium Priority (Phase 3-4):
6. ✅ Implement payment gateway abstraction layer
7. ✅ Add `payment_gateways` and `tenant_payment_configs` tables
8. ✅ Add commission/payout fields to `tenants` table
9. ✅ Archive duplicate `payments` table

### Low Priority (Phase 5+):
10. ✅ Multi-currency support in all payment tables
11. ✅ Webhook management system
12. ✅ Advanced analytics and reporting

---

## 📝 Next Steps

**Proceed to Phase 2:** Define unified target schema with:
- Consolidated plan management
- Farmer subscription tracking
- Multi-gateway payment processing
- Automated payout calculation

**Status:** ✅ Phase 1 Audit Complete - Ready for Phase 2
