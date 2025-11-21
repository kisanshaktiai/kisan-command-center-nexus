# Platform Monitoring - Database Tables

## Overview
This document outlines which database tables are used for platform monitoring and which apps should write to them.

## Core Monitoring Tables

### 1. `system_health_metrics`
**Purpose**: System resource utilization metrics (CPU, memory, disk)

**Schema**:
- `id`: UUID (Primary Key)
- `tenant_id`: UUID (Optional - for tenant-specific metrics)
- `metric_type`: TEXT (e.g., 'system')
- `metric_name`: TEXT (e.g., 'cpu_usage', 'memory_usage', 'disk_usage')
- `value`: NUMERIC (Percentage value 0-100)
- `unit`: TEXT (e.g., 'percent')
- `labels`: JSONB (Additional metadata)
- `timestamp`: TIMESTAMP
- `created_at`: TIMESTAMP

**Data Source**: 
- **Admin App**: Background monitoring service
- **Edge Functions**: Platform monitoring function
- Can be written from any codebase via Supabase functions

**Sample Insert**:
```sql
INSERT INTO system_health_metrics (tenant_id, metric_type, metric_name, value, unit, labels, timestamp)
VALUES (
  'tenant-uuid',
  'system',
  'cpu_usage',
  75.5,
  'percent',
  '{"component": "api-server"}',
  NOW()
);
```

### 2. `resource_utilization`
**Purpose**: Platform resource consumption (API calls, storage, bandwidth, connections)

**Schema**:
- `id`: UUID (Primary Key)
- `tenant_id`: UUID
- `resource_type`: TEXT ('api_calls', 'storage', 'bandwidth', 'database_connections')
- `current_usage`: INTEGER
- `max_limit`: INTEGER
- `usage_percentage`: NUMERIC (Auto-calculated: (current_usage / max_limit) * 100)
- `period_start`: TIMESTAMP
- `period_end`: TIMESTAMP
- `metadata`: JSONB
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

**Data Source**:
- **Admin App**: Aggregates usage data
- **Farmer App**: Increments API call counts via middleware
- **Tenant Portal**: Tracks storage and bandwidth usage

**Sample Insert**:
```sql
INSERT INTO resource_utilization (tenant_id, resource_type, current_usage, max_limit, usage_percentage, period_start, period_end, metadata)
VALUES (
  'tenant-uuid',
  'api_calls',
  15000,
  20000,
  75.0,
  NOW() - INTERVAL '1 hour',
  NOW(),
  '{"rate_limit_tier": "standard"}'
);
```

### 3. `api_logs`
**Purpose**: API request logs for monitoring and analytics

**Schema**:
- `id`: UUID (Primary Key)
- `tenant_id`: UUID
- `method`: TEXT ('GET', 'POST', etc.)
- `endpoint`: TEXT
- `status_code`: INTEGER
- `response_time_ms`: INTEGER
- `error_message`: TEXT (if error)
- `api_key_id`: UUID (Reference to api_keys table)
- `ip_address`: INET
- `user_agent`: TEXT
- `request_headers`: JSONB
- `request_body`: JSONB
- `response_headers`: JSONB
- `response_body`: JSONB
- `created_at`: TIMESTAMP

**Data Source**:
- **Farmer App**: Logs all API requests via middleware
- **Tenant Portal**: Logs all API requests via middleware
- **Admin App**: Logs admin API requests

**Sample Insert**:
```sql
INSERT INTO api_logs (tenant_id, method, endpoint, status_code, response_time_ms, ip_address, user_agent, created_at)
VALUES (
  'tenant-uuid',
  'POST',
  '/api/v1/farmers',
  201,
  156,
  '192.168.1.1',
  'Mozilla/5.0...',
  NOW()
);
```

### 4. `financial_analytics`
**Purpose**: Revenue and subscription metrics

**Schema**:
- `id`: UUID (Primary Key)
- `tenant_id`: UUID
- `metric_type`: TEXT ('revenue', 'mrr', 'arr')
- `amount`: NUMERIC
- `currency`: TEXT ('USD', 'INR')
- `period_start`: TIMESTAMP
- `period_end`: TIMESTAMP
- `period_type`: TEXT ('daily', 'weekly', 'monthly', 'yearly')
- `breakdown`: JSONB (Detailed breakdown by plan, etc.)
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

**Data Source**:
- **Admin App**: Aggregates billing data
- **Billing System**: Records transactions and subscriptions

**Sample Insert**:
```sql
INSERT INTO financial_analytics (tenant_id, metric_type, amount, currency, period_start, period_end, period_type, breakdown)
VALUES (
  'tenant-uuid',
  'revenue',
  50000.00,
  'INR',
  '2025-01-01',
  '2025-01-31',
  'monthly',
  '{"subscriptions": 45000, "one_time": 5000}'
);
```

### 5. `active_sessions`
**Purpose**: Track active user sessions

**Schema**:
- `id`: UUID (Primary Key)
- `user_id`: UUID
- `tenant_id`: UUID
- `session_started_at`: TIMESTAMP
- `last_active_at`: TIMESTAMP
- `is_active`: BOOLEAN
- `ip_address`: TEXT
- `user_agent`: TEXT
- `client_info`: JSONB
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

**Data Source**:
- **Farmer App**: Creates session on login
- **Tenant Portal**: Creates session on login
- **Admin App**: Creates session on login

**Sample Insert**:
```sql
INSERT INTO active_sessions (user_id, tenant_id, session_started_at, last_active_at, is_active, ip_address)
VALUES (
  'user-uuid',
  'tenant-uuid',
  NOW(),
  NOW(),
  true,
  '192.168.1.1'
);
```

## Reference Tables

These tables provide context for monitoring metrics:

### 6. `tenants`
- Used to count active tenants
- Filter: `status = 'active'`

### 7. `farmers`
- Used to count active farmers
- Shows platform reach

### 8. `dealers`
- Used to count active dealers
- Shows platform reach

## Data Collection Strategy

### Real-Time Data (Every Insert)
- `api_logs` - Logged on every API request
- `active_sessions` - Updated on user activity

### Periodic Data (Every 5-10 minutes)
- `system_health_metrics` - Background monitoring service
- `resource_utilization` - Aggregated from logs

### Daily Data (End of day)
- `financial_analytics` - Aggregated from billing system

## Implementation Guide

### For Farmer App & Tenant Portal:
1. **API Logging Middleware**: Log all requests to `api_logs`
2. **Session Management**: Create/update `active_sessions` on login/activity
3. **Usage Tracking**: Increment resource usage in `resource_utilization`

### For Admin App:
1. **Background Service**: Collect system metrics to `system_health_metrics`
2. **Resource Aggregation**: Calculate and insert `resource_utilization` data
3. **Financial Reporting**: Aggregate billing data to `financial_analytics`

### Sample Middleware (API Logging):
```typescript
// middleware/apiLogger.ts
export const apiLogger = async (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', async () => {
    const duration = Date.now() - startTime;
    
    await supabase.from('api_logs').insert({
      tenant_id: req.tenant_id,
      method: req.method,
      endpoint: req.path,
      status_code: res.statusCode,
      response_time_ms: duration,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      created_at: new Date().toISOString()
    });
  });
  
  next();
};
```

## Realtime Subscriptions

All monitoring tables have realtime enabled. Subscribe to changes:

```typescript
const channel = supabase
  .channel('monitoring')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'system_health_metrics'
  }, (payload) => {
    console.log('New health metric:', payload.new);
  })
  .subscribe();
```

## Testing & Data Generation

Use the "Start Generator" button in the Platform Monitoring page to generate sample data for testing.
