# Edge Functions Consolidation Plan - Complete Audit

## Executive Summary

**Current State:** 48 Edge Functions  
**Proposed State:** 28 Edge Functions (42% reduction)  
**Functions to Remove:** 20  
**Functions to Merge:** Multiple nested functions into unified endpoints

---

## Category 1: User Management Functions ✅ PHASE 1 COMPLETE

### Status: Partially Consolidated

### Current Functions (10 functions)
1. ✅ **user-management** (NEW - Keep)
2. ✅ **user-permissions** (Keep)
3. ❌ **user-operations** (REMOVE - Replaced by user-management)
4. ❌ **check-user-exists** (REMOVE - Replaced by user-management)
5. ❌ **get-user-by-email** (REMOVE - Replaced by user-management)
6. ⚠️ **register-user-with-welcome** (REMOVE - Duplicate of user-management)
7. ⚠️ **manage-user-tenant** (REMOVE - Duplicate of user-permissions)
8. ✅ **user-invitations** (Keep - Unified invitations)
9. ❌ **send-user-invite** (REMOVE - Duplicate of user-invitations)
10. ✅ **validate-user-invitation** (Keep - Validation service)

### Proposed Consolidation
**Keep:** 3 functions
- `user-management` (check-exists, get-by-email, register, update, deactivate, list)
- `user-permissions` (assign-role, manage-tenant, get-tenant-relationships)
- `validate-user-invitation` (validation only)

**Merge Into:** `user-invitations`
- Send admin invites
- Send user invites
- Verify invites
- Accept invites

**Remove:** 7 functions
- `user-operations` → `user-management`
- `check-user-exists` → `user-management?operation=check-exists`
- `get-user-by-email` → `user-management?operation=get-by-email`
- `register-user-with-welcome` → `user-management?operation=register`
- `send-user-invite` → `user-invitations?action=send`
- `manage-user-tenant` → `user-permissions?operation=manage-tenant`
- `send-admin-invite` → `user-invitations?action=send&invitation_type=admin`
- `verify-admin-invite` → `user-invitations?action=verify&invitation_type=admin`

---

## Category 2: Tenant Data Functions ⚠️ CRITICAL - MUST CONSOLIDATE

### Current Functions (4 functions)
1. **tenant-data** - Handles limits, metrics, analytics, activity
2. **tenant-settings-data** - Handles settings
3. **tenant-subscriptions-billing** - Handles billing
4. **tenant-limits-quotas** - DUPLICATE of tenant-data?data_type=limits

### Problem Analysis
❌ **Multiple functions doing similar tenant data retrieval**
❌ **tenant-limits-quotas is 100% duplicate** of tenant-data with data_type=limits
❌ **Four separate functions = 4x maintenance overhead**
❌ **Inconsistent error handling**
❌ **No unified caching strategy**

### Proposed Consolidation: ONE Function

**Create:** `tenant-api` (Unified Tenant Data API)

```typescript
Operations:
- get-limits        // Replace tenant-limits-quotas & tenant-data?data_type=limits
- get-metrics       // Replace tenant-data?data_type=metrics
- get-analytics     // Replace tenant-data?data_type=analytics
- get-activity      // Replace tenant-data?data_type=activity
- get-settings      // Replace tenant-settings-data
- get-billing       // Replace tenant-subscriptions-billing
- get-all          // Fetch multiple data types in parallel
```

**Remove:** 4 functions
- `tenant-limits-quotas` → `tenant-api?operation=get-limits`
- `tenant-data` → `tenant-api` (with operation parameter)
- `tenant-settings-data` → `tenant-api?operation=get-settings`
- `tenant-subscriptions-billing` → `tenant-api?operation=get-billing`

**Benefits:**
- ✅ Single source of truth for tenant data
- ✅ Unified error handling & logging
- ✅ Parallel data fetching with get-all operation
- ✅ Consistent caching strategy
- ✅ 75% reduction in tenant-related functions

---

## Category 3: Admin Functions

### Current Functions (4 functions)
1. ✅ **admin-utilities** (Keep - Data generation, utilities)
2. ⚠️ **assign-admin-role** (CHECK - May be duplicate of user-permissions)
3. ❌ **send-admin-invite** (REMOVE - Part of user-invitations)
4. ❌ **verify-admin-invite** (REMOVE - Part of user-invitations)

### Proposed Action
**Keep:** 1 function
- `admin-utilities`

**Review & Potentially Merge:**
- `assign-admin-role` → Check if `user-permissions` already handles this

**Remove:** 2 functions
- `send-admin-invite` → Already in `user-invitations`
- `verify-admin-invite` → Already in `user-invitations`

---

## Category 4: Lead Management Functions ✅ KEEP ALL

### Current Functions (4 functions)
1. ✅ **lead-analytics** (Keep)
2. ✅ **lead-notifications** (Keep)
3. ✅ **lead-processor** (Keep)
4. ✅ **convert-lead-to-tenant** (Keep)

**Status:** These are distinct, single-purpose functions. No consolidation needed.

---

## Category 5: NDVI & Satellite Functions ✅ KEEP ALL

### Current Functions (8 functions)
1. ✅ **batch-calculate-ndvi** (Keep)
2. ✅ **calculate-ndvi** (Keep)
3. ✅ **fetch-land-ndvi** (Keep)
4. ✅ **fetch-s2-ndvi** (Keep)
5. ✅ **mark-agricultural-tiles** (Keep)
6. ✅ **ndvi-data-process** (Keep)
7. ✅ **process-ndvi-highres** (Keep)
8. ✅ **sync-ndvi-complete** (Keep)

**Status:** Specialized satellite/NDVI processing. No consolidation needed.

---

## Category 6: Payment Functions ✅ KEEP ALL

### Current Functions (4 functions)
1. ✅ **payment-webhooks** (Keep)
2. ✅ **process-payment** (Keep)
3. ✅ **process-payout** (Keep)
4. ✅ **process-renewals** (Keep)

**Status:** Payment processing is critical and specialized. No consolidation needed.

---

## Category 7: Workflow & Misc Functions

### Current Functions (10 functions)
1. ✅ **start-onboarding-workflow** (Keep)
2. ✅ **fix-advance-step** (Keep)
3. ✅ **send-auth-email** (Keep - Email service)
4. ✅ **send-email** (Keep - General email)
5. ✅ **validate-gateway-keys** (Keep)
6. ⚠️ **validate-invitation** (CHECK - May be duplicate of validate-user-invitation)
7. ✅ **sync-tenant-domains** (Keep)
8. ✅ **tenant-conversion-email** (Keep)
9. ✅ **tenant-default-branding** (Keep)
10. ✅ **create-tenant-with-admin** (Keep)

### Proposed Action
**Review:**
- Check if `validate-invitation` is duplicate of `validate-user-invitation`

---

## Category 8: Monitoring & Utilities ✅ KEEP ALL

### Current Functions (3 functions)
1. ✅ **platform-monitoring** (Keep)
2. ✅ **cleanup-rate-limits** (Keep)
3. ✅ **generate-branding-suggestions** (Keep)

**Status:** Essential system functions. No consolidation needed.

---

## Category 9: Master Data Operations ⚠️ ACTION REQUIRED

### Current Status
❌ **Using Direct Supabase Calls** - No edge functions!

### Files Using Direct Calls
- `src/pages/super-admin/MasterCompanies.tsx`
- `src/pages/super-admin/ProductCategories.tsx`
- `src/pages/super-admin/MasterProducts.tsx`

### Required Action
**Extend:** `generic-operations` edge function

Add to `ALLOWED_TABLES`:\
```typescript
const ALLOWED_TABLES = [
  // ... existing tables ...
  'master_companies',
  'master_product_categories',
  'master_products',
];

const SUPER_ADMIN_TABLES = [
  'master_companies',
  'master_product_categories',
  'master_products'
];
```

**Update:** Frontend pages to use `useGenericOperations` hook

---

## Detailed Removal Plan

### Phase 1: User Management (Already Complete) ✅
**Remove:**
1. `user-operations` → Replaced by `user-management`
2. `check-user-exists` → Replaced by `user-management`
3. `get-user-by-email` → Replaced by `user-management`

**Frontend Updates Needed:**
- ✅ `src/services/user-tenant/UserAuthService.ts`
- ✅ `src/hooks/useTenantUserManagement.ts`

---

### Phase 2: User Invitations & Admin (NEXT PRIORITY) 🔥

**Remove:**
1. `send-user-invite` (197 lines) - Duplicate of `user-invitations`
2. `send-admin-invite` (if separate) - Part of `user-invitations`
3. `verify-admin-invite` (if separate) - Part of `user-invitations`
4. `register-user-with-welcome` - Duplicate of `user-management`
5. `manage-user-tenant` - Duplicate of `user-permissions`

**Frontend Files to Update:**
```bash
# Search for usage
src/components/onboarding/steps/EnhancedUsersRolesStep.tsx
src/components/onboarding/steps/UsersRolesStep.tsx
src/components/super-admin/AdminInviteManager.tsx
src/components/tenant/TenantDetailsCompact.tsx
```

**Migration:**
```typescript
// OLD
await supabase.functions.invoke('send-user-invite', { body: {...} })

// NEW
await supabase.functions.invoke('user-invitations', { 
  body: { action: 'send', invitation_type: 'user', ...} 
})
```

---

### Phase 3: Tenant Data Consolidation (CRITICAL) 🔥🔥🔥

**Remove:**
1. `tenant-limits-quotas` (109 lines) - 100% duplicate
2. `tenant-data` (556 lines)
3. `tenant-settings-data` (163 lines)
4. `tenant-subscriptions-billing` (265 lines)

**Create:**
- `tenant-api` - Unified tenant data endpoint

**Frontend Files to Update:**
```bash
# Search for tenant data function calls
src/components/billing/SubscriptionOverview.tsx
src/components/billing/SubscriptionRenewals.tsx
src/components/tenant/charts/RealTimeMetricsWidget.tsx
src/features/tenant/hooks/useTenantAnalytics.ts
src/hooks/useTenantManagement.ts
```

**Migration:**
```typescript
// OLD - Multiple function calls
await supabase.functions.invoke('tenant-limits-quotas', { body: { tenantId } })
await supabase.functions.invoke('tenant-data', { body: { tenantId, data_type: 'metrics' } })
await supabase.functions.invoke('tenant-settings-data', { body: { tenant_id: tenantId } })
await supabase.functions.invoke('tenant-subscriptions-billing', { body: { tenantId } })

// NEW - Single unified function
await supabase.functions.invoke('tenant-api', { 
  body: { 
    tenantId,
    operation: 'get-all', // or 'get-limits', 'get-metrics', 'get-settings', 'get-billing'
    include: ['limits', 'metrics', 'settings', 'billing'] // for parallel fetch
  } 
})
```

---

### Phase 4: Master Data (EXTEND EXISTING) 🔥

**Extend:** `generic-operations`

**Update Frontend:**
1. `src/pages/super-admin/MasterCompanies.tsx`
2. `src/pages/super-admin/ProductCategories.tsx`
3. `src/pages/super-admin/MasterProducts.tsx`

**Migration:**
```typescript
// OLD - Direct Supabase calls
await supabase.from('master_companies').select('*')
await supabase.from('master_companies').insert(data)
await supabase.from('master_companies').update(data).eq('id', id)
await supabase.from('master_companies').delete().eq('id', id)

// NEW - Use useGenericOperations hook
const { createMutation, updateMutation, deleteMutation, useList } = 
  useGenericOperations('master_companies');
```

---

## Summary of Changes

### Functions to Remove (20 total)

#### User Management (7)
1. ❌ `user-operations`
2. ❌ `check-user-exists`
3. ❌ `get-user-by-email`
4. ❌ `register-user-with-welcome`
5. ❌ `send-user-invite`
6. ❌ `manage-user-tenant`
7. ❌ `assign-admin-role` (if duplicate)

#### Admin (2)
8. ❌ `send-admin-invite`
9. ❌ `verify-admin-invite`

#### Tenant Data (4)
10. ❌ `tenant-limits-quotas`
11. ❌ `tenant-data`
12. ❌ `tenant-settings-data`
13. ❌ `tenant-subscriptions-billing`

#### Validation (1)
14. ❌ `validate-invitation` (if duplicate)

### Functions to Create (1)
1. ✅ `tenant-api` - Unified tenant data endpoint

### Functions to Extend (1)
1. ✅ `generic-operations` - Add master data tables

---

## Implementation Steps (DO NOT EXECUTE WITHOUT PERMISSION)

### Step 1: Review & Verification
- [ ] Review all function usage in codebase
- [ ] Identify all frontend files using deprecated functions
- [ ] Verify no custom logic will be lost
- [ ] Create backup of current edge functions

### Step 2: Phase 2 Implementation (User Invitations)
- [ ] Update all frontend files using `send-user-invite`
- [ ] Update all frontend files using admin invite functions
- [ ] Test all invitation flows
- [ ] Remove deprecated user invitation functions
- [ ] Update config.toml

### Step 3: Phase 3 Implementation (Tenant Data)
- [ ] Create new `tenant-api` function
- [ ] Update all frontend files using tenant data functions
- [ ] Test all tenant data retrieval
- [ ] Remove deprecated tenant functions
- [ ] Update config.toml

### Step 4: Phase 4 Implementation (Master Data)
- [ ] Extend `generic-operations` with master tables
- [ ] Update MasterCompanies.tsx
- [ ] Update ProductCategories.tsx
- [ ] Update MasterProducts.tsx
- [ ] Test all CRUD operations

### Step 5: Cleanup
- [ ] Remove edge function folders from supabase/functions
- [ ] Clean up config.toml entries
- [ ] Update documentation
- [ ] Monitor logs for 30 days
- [ ] Archive old code

---

## Risk Assessment

### High Risk
🔴 **Tenant Data Consolidation** - Many frontend components depend on these
🔴 **User Invitation Changes** - Core auth flow

### Medium Risk
🟡 **Master Data Migration** - Affects super admin features only

### Low Risk
🟢 **Already Completed** - user-management consolidation

---

## Rollback Plan

1. **Keep old functions for 30 days** after migration
2. **Add deprecation warnings** to old functions
3. **Monitor error logs** for any issues
4. **Gradual migration** - one category at a time
5. **Feature flags** for new endpoints

---

## Benefits After Consolidation

✅ **42% reduction** in edge functions (48 → 28)  
✅ **Unified APIs** - consistent interfaces  
✅ **Better caching** - single endpoints  
✅ **Easier maintenance** - less code duplication  
✅ **Improved performance** - parallel data fetching  
✅ **Better monitoring** - centralized logging  
✅ **Reduced deployment time** - fewer functions  
✅ **Lower costs** - fewer cold starts  

---

## Next Steps

1. **GET APPROVAL** from team for consolidation plan
2. **Review** all identified duplicates
3. **Create** detailed migration guides per phase
4. **Test** in development environment first
5. **Monitor** logs and metrics during migration
6. **Document** all changes thoroughly

---

**Status:** 📋 PLAN CREATED - AWAITING APPROVAL  
**Last Updated:** 2025-11-21  
**Review Required:** YES - Do not proceed without explicit permission
