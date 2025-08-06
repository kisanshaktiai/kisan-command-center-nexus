
# API Documentation

## Overview

The platform uses Supabase for backend services, including:
- PostgreSQL database with Row Level Security
- Authentication and user management
- Edge Functions for custom business logic
- Real-time subscriptions

## Authentication

All API calls require authentication unless specified otherwise.

### Authentication Headers
```typescript
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  }
});
```

## Core Services

### LeadService

#### getLeads()
Fetch all leads for the authenticated user's tenant.

```typescript
const result = await LeadService.getLeads();
// Returns: ServiceResult<Lead[]>
```

#### updateLead(leadId, updates)
Update a specific lead.

```typescript
const result = await LeadService.updateLead(leadId, {
  status: 'contacted',
  notes: 'Follow up scheduled'
});
// Returns: ServiceResult<Lead>
```

#### createLead(leadData)
Create a new lead.

```typescript
const result = await LeadService.createLead({
  contact_name: 'John Doe',
  email: 'john@example.com',
  organization_name: 'Acme Corp',
  source: 'website'
});
// Returns: ServiceResult<Lead>
```

### TenantService

#### getTenants(filters?)
Fetch tenants (admin only).

```typescript
const result = await TenantService.getTenants({
  status: 'active',
  subscription_plan: 'Kisan_Basic'
});
// Returns: ServiceResult<Tenant[]>
```

#### createTenant(tenantData)
Create a new tenant.

```typescript
const result = await TenantService.createTenant({
  name: 'New Organization',
  slug: 'new-org',
  type: 'agri_company',
  owner_email: 'owner@neworg.com'
});
// Returns: ServiceResult<Tenant>
```

## Edge Functions

### convert-lead-to-tenant

Converts a qualified lead into a tenant with admin user.

**Endpoint**: `/functions/v1/convert-lead-to-tenant`

**Method**: POST

**Payload**:
```typescript
{
  leadId: string;
  tenantName: string;
  tenantSlug: string;
  subscriptionPlan?: string;
  adminEmail?: string;
  adminName?: string;
}
```

**Response**:
```typescript
{
  success: boolean;
  tenant_id?: string;
  user_id?: string;
  message?: string;
  error?: string;
  code?: string;
}
```

### lead-analytics

Provides analytics data for leads.

**Endpoint**: `/functions/v1/lead-analytics`

**Method**: GET

**Response**:
```typescript
{
  totalLeads: number;
  statusCounts: Record<string, number>;
  conversionRate: number;
  averageScore: number;
}
```

## Database Schema

### Core Tables

#### leads
```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  organization_name TEXT,
  phone TEXT,
  source TEXT,
  status lead_status NOT NULL DEFAULT 'new',
  priority lead_priority DEFAULT 'medium',
  lead_score INTEGER DEFAULT 0,
  assigned_to UUID REFERENCES admin_users(id),
  converted_tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### tenants
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type tenant_type NOT NULL DEFAULT 'agri_company',
  status tenant_status NOT NULL DEFAULT 'trial',
  subscription_plan subscription_plan_type DEFAULT 'Kisan_Basic',
  owner_email TEXT,
  owner_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### admin_users
```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role admin_role NOT NULL DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Enums

```sql
CREATE TYPE lead_status AS ENUM (
  'new', 'assigned', 'contacted', 'qualified', 'converted', 'rejected'
);

CREATE TYPE lead_priority AS ENUM (
  'low', 'medium', 'high', 'urgent'
);

CREATE TYPE tenant_status AS ENUM (
  'trial', 'active', 'suspended', 'canceled'
);

CREATE TYPE admin_role AS ENUM (
  'super_admin', 'platform_admin', 'admin'
);
```

## Real-time Subscriptions

### Leads Updates
```typescript
useEffect(() => {
  const channel = supabase
    .channel('leads-realtime')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'leads'
    }, (payload) => {
      // Handle real-time updates
      queryClient.invalidateQueries(['leads']);
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}, []);
```

## Error Handling

### Standard Error Response
```typescript
interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}
```

### Common Error Codes
- `VALIDATION_ERROR`: Input validation failed
- `AUTHENTICATION_ERROR`: User not authenticated
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `CONFLICT`: Resource already exists
- `RATE_LIMITED`: Too many requests

## Rate Limits

- API calls: 60 requests per minute per user
- Authentication attempts: 5 per hour per IP
- Password resets: 3 per hour per email

## Security

### Row Level Security Policies

All tenant-related tables implement RLS:

```sql
-- Example RLS policy for leads
CREATE POLICY "Users can access leads for their tenant" ON leads
FOR ALL USING (
  tenant_id IN (
    SELECT tenant_id FROM user_tenants 
    WHERE user_id = auth.uid() AND is_active = true
  )
);
```

### Input Validation

All inputs are validated both client-side and server-side:

```typescript
const leadSchema = z.object({
  contact_name: z.string().min(1).max(100),
  email: z.string().email(),
  organization_name: z.string().optional(),
  phone: z.string().optional(),
});
```

### Audit Logging

Critical operations are logged:

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```
