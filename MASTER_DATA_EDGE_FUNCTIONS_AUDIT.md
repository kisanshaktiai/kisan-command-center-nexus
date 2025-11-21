# Master Data Edge Functions Audit Report

## Current State Analysis

### Features Under Review
1. **Master Companies** (`/super-admin/master-companies`)
2. **Product Categories** (`/super-admin/product-categories`)
3. **Master Products** (`/super-admin/master-products`)

### Current Implementation

#### ❌ PROBLEM: Direct Supabase Client Calls
All three features currently use **direct Supabase client calls** instead of edge functions:

**Master Companies** (`src/pages/super-admin/MasterCompanies.tsx`):
```typescript
// Direct calls to master_companies table
supabase.from('master_companies').select('*')
supabase.from('master_companies').insert(data)
supabase.from('master_companies').update(data).eq('id', id)
supabase.from('master_companies').delete().eq('id', id)
```

**Product Categories** (`src/pages/super-admin/ProductCategories.tsx`):
```typescript
// Direct calls to master_product_categories table
supabase.from('master_product_categories').select('*')
supabase.from('master_product_categories').insert(data)
supabase.from('master_product_categories').update(data).eq('id', id)
supabase.from('master_product_categories').delete().eq('id', id)
```

**Master Products** (`src/pages/super-admin/MasterProducts.tsx`):
```typescript
// Direct calls to master_products table
supabase.from('master_products').select('*')
supabase.from('master_products').insert(data)
supabase.from('master_products').update(data).eq('id', id)
supabase.from('master_products').delete().eq('id', id)
```

### Issues with Current Approach

1. **No Centralized Business Logic**: Validation and business rules scattered across components
2. **No Audit Trail**: No centralized logging of who did what and when
3. **Security Risk**: Direct database access exposes table structure
4. **No Rate Limiting**: No protection against abuse
5. **Difficult to Maintain**: Changes require updating multiple files
6. **No Data Validation**: Client-side validation only, no server-side enforcement

## Recommendation: Consolidate to One Edge Function

### ✅ SOLUTION: Extend Existing `generic-operations` Edge Function

**Why this approach?**
- ✅ Follows \"one feature, one edge function\" principle
- ✅ Reuses existing infrastructure (audit, validation, security)
- ✅ DRY (Don't Repeat Yourself)
- ✅ Centralized business logic
- ✅ Built-in audit logging
- ✅ Security through service role
- ✅ Easier to maintain

### Implementation Plan

#### Step 1: Update `generic-operations` Edge Function
**File**: `supabase/functions/generic-operations/index.ts`

**Changes needed**:
```typescript
// Add super admin tables to whitelist
const ALLOWED_TABLES = [
  // ... existing tables ...
  'master_companies',
  'master_product_categories', 
  'master_products',
]

// Create separate list for super admin tables (no tenant isolation)
const SUPER_ADMIN_TABLES = [
  'master_companies',
  'master_product_categories',
  'master_products'
]

// Update tenant isolation logic to skip super admin tables
if (TENANT_ISOLATED_TABLES.includes(table) && !SUPER_ADMIN_TABLES.includes(table)) {
  // ... existing tenant check ...
}
```

#### Step 2: Update Frontend Pages
Use the existing `useGenericOperations` hook instead of direct Supabase calls:

**Master Companies**:
```typescript
const { createMutation, updateMutation, deleteMutation, useList } = 
  useGenericOperations('master_companies');
```

**Product Categories**:
```typescript
const { createMutation, updateMutation, deleteMutation, useList } = 
  useGenericOperations('master_product_categories');
```

**Master Products**:
```typescript
const { createMutation, updateMutation, deleteMutation, useList } = 
  useGenericOperations('master_products');
```

## Edge Functions to Keep

### ✅ KEEP: generic-operations
- **Purpose**: Unified CRUD operations for all tables
- **Status**: Extend to support super admin tables
- **Used By**: Will be used by Master Companies, Product Categories, Master Products

## Edge Functions NOT Related to Master Data

The following edge functions are unrelated to master data management and should remain:

### Admin & Auth Functions
- `admin-utilities` - Admin user management
- `assign-admin-role` - Role assignment
- `send-admin-invite` - Admin invitations
- `verify-admin-invite` - Invite verification
- `register-user-with-welcome` - User registration
- `check-user-exists` - User validation
- `get-user-by-email` - User lookup
- `user-management` - User operations
- `user-operations` - User CRUD
- `user-permissions` - Permission management
- `user-invitations` - User invites
- `send-user-invite` - Send invite
- `validate-user-invitation` - Validate invite
- `manage-user-tenant` - Tenant management

### Lead Management Functions
- `convert-lead-to-tenant` - Lead conversion
- `lead-analytics` - Analytics
- `lead-notifications` - Notifications
- `lead-processor` - Processing

### Tenant Functions
- `create-tenant-with-admin` - Tenant setup
- `tenant-data` - Tenant data
- `tenant-settings-data` - Settings
- `tenant-subscriptions-billing` - Billing
- `tenant-limits-quotas` - Quotas
- `tenant-default-branding` - Branding
- `tenant-conversion-email` - Emails
- `sync-tenant-domains` - Domain sync
- `generate-branding-suggestions` - AI branding

### NDVI & Satellite Functions
- `batch-calculate-ndvi` - Batch NDVI
- `calculate-ndvi` - NDVI calculation
- `fetch-land-ndvi` - Land NDVI
- `fetch-s2-ndvi` - Sentinel-2 NDVI
- `mark-agricultural-tiles` - Tile marking
- `ndvi-data-process` - NDVI processing
- `process-ndvi-highres` - High-res NDVI
- `sync-ndvi-complete` - NDVI sync

### Payment & Monitoring Functions
- `payment-webhooks` - Payment webhooks
- `process-payment` - Payment processing
- `process-payout` - Payouts
- `process-renewals` - Renewals
- `platform-monitoring` - Monitoring
- `cleanup-rate-limits` - Rate limit cleanup

### Workflow Functions
- `start-onboarding-workflow` - Onboarding
- `send-auth-email` - Auth emails
- `send-email` - General emails
- `validate-gateway-keys` - Gateway validation
- `validate-invitation` - Invite validation
- `fix-advance-step` - Step fixes

## Summary

### ❌ Edge Functions to Remove
**NONE** - No edge functions need to be removed. The issue is that edge functions are NOT being used where they should be.

### ✅ Changes Required
1. **Extend** `generic-operations` edge function to support super admin tables
2. **Update** frontend pages to use `useGenericOperations` hook instead of direct Supabase calls
3. **Result**: Proper separation of concerns, centralized business logic, audit trail, security

### Benefits After Implementation
- ✅ Centralized business logic
- ✅ Automatic audit logging
- ✅ Enhanced security
- ✅ Rate limiting capability
- ✅ Easier maintenance
- ✅ Consistent error handling
- ✅ Server-side validation
- ✅ Better scalability

## Next Steps
1. Update `generic-operations` edge function
2. Refactor Master Companies page
3. Refactor Product Categories page  
4. Refactor Master Products page
5. Test all CRUD operations
6. Verify audit logs are created
