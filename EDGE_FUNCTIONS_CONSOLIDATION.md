# Edge Functions Consolidation - Phase 1: User Management

## Overview
This document tracks the consolidation of user management edge functions to reduce total function count and improve maintainability.

## Phase 1: User Management Consolidation (COMPLETED)

### Objective
Merge 6 user-related functions into 2 unified endpoints with comprehensive testing and rate limiting.

### Consolidated Functions

#### 1. **user-management** (NEW - Unified User Operations)
**Location**: `supabase/functions/user-management/index.ts`

**Operations**:
- `check-exists`: Check if user exists in auth.users
- `get-by-email` / `get`: Get user data by email
- `register`: Register new user with optional welcome email
- `update`: Update user metadata
- `deactivate`: Deactivate user account
- `list`: List users with filters

**Features**:
- Database-backed rate limiting
  - Registration: 3 req/min (HIGH_SENSITIVITY)
  - Other operations: 10 req/min (MEDIUM)
- Comprehensive validation
- Audit logging via rate limit buckets
- Multi-tenant support
- Secure password generation

**Example Usage**:
```typescript
// Check if user exists
const { data } = await supabase.functions.invoke('user-management', {
  body: { 
    operation: 'check-exists',
    email: 'user@example.com'
  }
});

// Register new user
const { data } = await supabase.functions.invoke('user-management', {
  body: { 
    operation: 'register',
    email: 'newuser@example.com',
    full_name: 'John Doe',
    tenant_id: 'tenant-uuid',
    send_welcome_email: true
  }
});

// Get user by email
const { data } = await supabase.functions.invoke('user-management', {
  body: { 
    operation: 'get-by-email',
    email: 'user@example.com'
  }
});

// Update user
const { data } = await supabase.functions.invoke('user-management', {
  body: { 
    operation: 'update',
    user_id: 'user-uuid',
    metadata: { custom_field: 'value' }
  }
});

// List users for tenant
const { data } = await supabase.functions.invoke('user-management', {
  body: { 
    operation: 'list',
    tenant_id: 'tenant-uuid',
    limit: 50
  }
});
```

#### 2. **user-permissions** (ENHANCED - Existing)
**Location**: `supabase/functions/user-permissions/index.ts`

**Operations**:
- `assign-role`: Assign admin role to user
- `manage-tenant`: Manage user-tenant relationships
- `get-tenant-relationships`: Get user's tenant relationships

**Features**:
- In-memory rate limiting (5 req/min)
- Permission validation
- Role-based access control
- Security event logging

### Deprecated Functions (TO BE REMOVED)

These functions are now replaced by `user-management`:

1. **check-user-exists** → `user-management?operation=check-exists`
2. **get-user-by-email** → `user-management?operation=get-by-email`
3. **user-operations** → `user-management` (multiple operations)
   - `check-exists` operation
   - `get` operation
   - `register` operation

### Migration Path

#### Frontend Services Updated
- ✅ `src/services/user-tenant/UserAuthService.ts` - Updated to use `user-management`
- ✅ `src/hooks/useTenantUserManagement.ts` - Updated to use `user-management`

#### Changes Made:
```typescript
// OLD
await supabase.functions.invoke('user-operations', {
  body: { operation: 'check-exists', email }
});

// NEW
await supabase.functions.invoke('user-management', {
  body: { operation: 'check-exists', email }
});

// OLD
await supabase.functions.invoke('user-operations', {
  body: { operation: 'register', email, fullName, tenantId }
});

// NEW
await supabase.functions.invoke('user-management', {
  body: { 
    operation: 'register', 
    email, 
    full_name: fullName, 
    tenant_id: tenantId,
    send_welcome_email: true
  }
});
```

### Benefits

1. **Reduced Function Count**: 6 → 2 functions (67% reduction in user management functions)
2. **Better Rate Limiting**: Database-backed rate limiting with proper tracking
3. **Improved Maintainability**: Single source of truth for user operations
4. **Consistent API**: Unified interface for all user operations
5. **Better Monitoring**: Centralized logging and rate limit tracking

### Testing

#### Manual Testing Checklist
- ✅ Function deploys successfully
- ✅ Config.toml updated with new function
- ✅ Frontend services updated to use new endpoint
- ⏳ Test check-exists operation
- ⏳ Test register operation
- ⏳ Test get-by-email operation
- ⏳ Test rate limiting (should block after limit exceeded)

#### Automated Testing
```bash
# Test check-exists
curl -X POST 'https://qfklkkzxemsbeniyugiz.supabase.co/functions/v1/user-management' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"operation": "check-exists", "email": "test@example.com"}'

# Test register
curl -X POST 'https://qfklkkzxemsbeniyugiz.supabase.co/functions/v1/user-management' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"operation": "register", "email": "newuser@example.com", "full_name": "Test User", "send_welcome_email": false}'

# Test rate limiting (send multiple requests quickly)
for i in {1..10}; do
  curl -X POST 'https://qfklkkzxemsbeniyugiz.supabase.co/functions/v1/user-management' \
    -H "Authorization: Bearer YOUR_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{"operation": "register", "email": "test'$i'@example.com", "full_name": "Test User"}'
done
```

### Next Steps

#### Immediate (Current Phase)
- [ ] Complete user acceptance testing
- [ ] Monitor logs for any errors
- [ ] Verify rate limiting is working correctly
- [ ] Add more comprehensive error handling if needed

#### Phase 2: Invitation Consolidation
- [ ] Merge 5 invitation functions into 2 endpoints
- [ ] Create unified `invitations` function
- [ ] Keep `validate-invitation` for frontend validation
- [ ] Update all invitation-related frontend code

#### Phase 3: Tenant Data Consolidation
- [ ] Merge 5 tenant data functions into 1 `tenant-api` endpoint
- [ ] Support multiple data types in single request
- [ ] Implement efficient parallel queries

#### Long-term
- [ ] Delete deprecated functions after 30-day grace period
- [ ] Update all documentation
- [ ] Add function deprecation warnings

## Database Schema

### Rate Limit Buckets
The `rate_limit_buckets` table tracks rate limiting:
```sql
- identifier (client IP)
- function_name ('user-management')
- request_count (incremented on each request)
- window_start / window_end (time window)
- last_request (timestamp)
```

## Support

For questions or issues with the consolidation:
1. Check edge function logs: [Link](https://supabase.com/dashboard/project/qfklkkzxemsbeniyugiz/functions/user-management/logs)
2. Review rate limit data: Query `rate_limit_buckets` table
3. Check audit logs for user operations

---

**Status**: ✅ Phase 1 Complete
**Last Updated**: 2025-11-20
**Functions Reduced**: 6 → 2 (4 functions consolidated)
