# Subscription Plans Integration

## Overview
The Billing Management page now uses the `subscription_plans` table from the public schema as the single source of truth for all subscription plan data.

## Changes Made

### 1. New Hook: `useSubscriptionPlans`
**Location**: `src/hooks/useSubscriptionPlans.ts`

**Features:**
- Fetches plans from `public.subscription_plans` table
- Supports filtering by:
  - `isActive` - Show only active plans
  - `isPublic` - Show only public plans
  - `tenantId` - Filter by tenant (null for global plans)
- Includes mutations for CRUD operations:
  - `useCreateSubscriptionPlan`
  - `useUpdateSubscriptionPlan`
  - `useDeleteSubscriptionPlan`
- Auto-invalidates cache on updates
- Toast notifications for success/error

**Usage:**
```typescript
// Get all active global plans
const { data: plans } = useSubscriptionPlans({ 
  isActive: true,
  isPublic: true,
  tenantId: null 
});

// Create new plan
const createPlan = useCreateSubscriptionPlan();
createPlan.mutate({
  name: 'Premium Plan',
  plan_type: 'premium',
  price_monthly: 99.99,
  features: ['feature1', 'feature2'],
  limits: { max_users: 100 }
});
```

### 2. New Component: `SubscriptionPlanCard`
**Location**: `src/components/billing/SubscriptionPlanCard.tsx`

**Features:**
- Beautiful card layout with plan details
- Shows pricing (monthly, quarterly, annually)
- Displays savings percentage for annual plans
- Lists features with checkmarks
- Shows usage limits in a grid
- Plan type icons (Star, Zap, Crown)
- Highlights "Most Popular" plans (premium)
- Stripe integration indicator
- Optional edit/delete actions
- Status badges (Active/Inactive, Custom)

**Props:**
```typescript
interface SubscriptionPlanCardProps {
  plan: SubscriptionPlan;
  onEdit?: (plan: SubscriptionPlan) => void;
  onDelete?: (planId: string) => void;
  showActions?: boolean;
}
```

### 3. Updated Billing Management Page
**Location**: `src/pages/super-admin/BillingManagement.tsx`

**Changes:**
- Replaced `usePlans()` with `useSubscriptionPlans()`
- Updated Plans tab to use `SubscriptionPlanCard`
- Real-time updates for `subscription_plans` table changes
- Filter for only active, public, global plans
- Show plan count in badge
- Responsive grid layout (1/2/3 columns)

## Database Schema

### subscription_plans Table
```sql
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  plan_type subscription_plan_type NOT NULL, -- basic | premium | enterprise | custom
  plan_category TEXT,
  
  -- Pricing
  price_monthly NUMERIC,
  price_quarterly NUMERIC,
  price_annually NUMERIC,
  trial_days INTEGER,
  
  -- Configuration
  features JSONB, -- Array of feature names or object
  limits JSONB,   -- Usage limits: { max_farmers: 100, max_lands: 50 }
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,
  is_custom BOOLEAN DEFAULT false,
  
  -- Multi-tenancy
  tenant_id UUID REFERENCES tenants(id), -- NULL for global plans
  
  -- Stripe Integration
  stripe_product_id TEXT,
  stripe_price_id_monthly TEXT,
  stripe_price_id_annually TEXT,
  
  -- Metadata
  sort_order INTEGER,
  billing_interval TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Pre-filled Plans
The table comes with 3 default plans:
1. **Basic** - $29.99/month
2. **Growth** - $99.99/month (Most Popular)
3. **Enterprise** - $299.99/month

## Plan Types

### Enum Values
```typescript
type PlanType = 'basic' | 'premium' | 'enterprise' | 'custom';
```

### Icons
- **basic**: Star icon (⭐)
- **premium**: Zap icon (⚡) - Highlighted as "Most Popular"
- **enterprise**: Crown icon (👑)
- **custom**: Star icon (⭐)

## Features Display

### Features JSON Structure
The `features` column accepts multiple formats:

**Array format:**
```json
["farmer_management", "basic_analytics", "weather_data"]
```

**Object format:**
```json
{
  "farmer_management": true,
  "advanced_analytics": true,
  "api_access": false
}
```

The card component automatically handles both formats.

### Limits JSON Structure
```json
{
  "max_farmers": 100,
  "max_lands": 50,
  "storage_gb": 5,
  "api_calls_per_month": 10000
}
```

Displayed in a 2-column grid with formatted labels.

## Pricing Display

### Monthly Pricing
Always shown as the primary price with large bold text.

### Quarterly/Annual Pricing
- Shown below monthly price in smaller text
- **Automatic savings calculation** for annual plans
- Badge shows percentage saved vs monthly × 12

Example:
```
$99 /month
$990 annually  [Save 17%]
```

### Trial Period
If `trial_days > 0`, shows a badge:
```
14 days free trial
```

## Real-Time Updates

### Subscription Setup
```typescript
supabase
  .channel('billing-realtime')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'subscription_plans'
  }, () => {
    queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
    setLastUpdate(new Date());
  })
  .subscribe();
```

When plans are created, updated, or deleted:
1. Real-time notification received
2. Query cache invalidated
3. UI automatically refreshes
4. Last update timestamp shown

## Usage Examples

### Display Plans on Admin Dashboard
```tsx
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import { SubscriptionPlanCard } from '@/components/billing/SubscriptionPlanCard';

function AdminDashboard() {
  const { data: plans } = useSubscriptionPlans({ 
    isActive: true,
    isPublic: true,
    tenantId: null 
  });

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {plans?.map((plan) => (
        <SubscriptionPlanCard key={plan.id} plan={plan} />
      ))}
    </div>
  );
}
```

### Edit Plan Handler
```tsx
function PlanManagement() {
  const updatePlan = useUpdateSubscriptionPlan();

  const handleEdit = (plan: SubscriptionPlan) => {
    updatePlan.mutate({
      id: plan.id,
      updates: {
        price_monthly: 109.99,
        features: [...existingFeatures, 'new_feature']
      }
    });
  };

  return (
    <SubscriptionPlanCard 
      plan={plan} 
      onEdit={handleEdit}
      showActions={true}
    />
  );
}
```

### Farmer Subscription Selection
```tsx
function SubscriptionSelection() {
  const { data: plans } = useSubscriptionPlans({ 
    isActive: true,
    isPublic: true,
    tenantId: null 
  });

  return plans?.map((plan) => (
    <SubscriptionPlanCard 
      key={plan.id} 
      plan={plan}
      showActions={false} // Hide edit/delete for farmers
    />
  ));
}
```

## Benefits

### Single Source of Truth
- All plans stored in one table
- No data duplication
- Consistent across all portals
- Easy to maintain and update

### Flexibility
- Support for custom tenant-specific plans
- Global plans (tenant_id = NULL)
- Multiple pricing tiers
- Feature flags per plan
- Usage limits per plan

### Integration
- Stripe product/price IDs
- Real-time synchronization
- Automatic cache invalidation
- Toast notifications

### User Experience
- Beautiful card design
- Clear pricing display
- Feature comparisons
- Savings calculations
- Trial period highlighting

## Migration Path

### Old System (Phase 4)
Used the `plans` table from the unified billing schema:
```typescript
const { data: plans } = usePlans();
```

### New System (Current)
Uses `subscription_plans` table from public schema:
```typescript
const { data: plans } = useSubscriptionPlans({ 
  isActive: true,
  isPublic: true,
  tenantId: null 
});
```

### Benefits of Migration
1. **Consistency**: Same table used across all features
2. **Pre-filled Data**: Comes with default plans
3. **Better Schema**: More fields for real-world needs
4. **Stripe Integration**: Built-in Stripe fields
5. **Tenant Support**: Custom plans per tenant

## Future Enhancements

### Planned Features
1. **Plan Comparison Tool**: Side-by-side comparison
2. **Plan Recommendations**: AI-powered suggestions
3. **Usage-Based Pricing**: Metered billing support
4. **Add-ons**: Extra features on top of plans
5. **Bulk Operations**: Manage multiple plans
6. **Version History**: Track plan changes
7. **A/B Testing**: Test different pricing strategies
8. **Analytics**: Track plan popularity

### Stripe Integration
1. Auto-sync with Stripe products
2. Webhook for price updates
3. Automatic product creation
4. Price change history

## Conclusion

The Billing Management page now correctly uses the `subscription_plans` table as the single source of truth for all subscription plan data. This provides:

- ✅ Consistent data across all portals
- ✅ Beautiful plan display cards
- ✅ Real-time updates
- ✅ Flexible filtering
- ✅ Stripe integration ready
- ✅ Pre-filled with default plans
- ✅ Support for tenant-specific plans

The system is production-ready and fully integrated with the existing billing infrastructure.
