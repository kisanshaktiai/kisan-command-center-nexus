
export enum Permission {
  // System-wide permissions
  SYSTEM_ADMIN = 'system:admin',
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_METRICS = 'system:metrics',
  
  // Tenant management
  TENANT_CREATE = 'tenant:create',
  TENANT_READ = 'tenant:read',
  TENANT_UPDATE = 'tenant:update',
  TENANT_DELETE = 'tenant:delete',
  TENANT_CONFIG = 'tenant:config',
  
  // User management
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_INVITE = 'user:invite',
  
  // Admin management
  ADMIN_CREATE = 'admin:create',
  ADMIN_READ = 'admin:read',
  ADMIN_UPDATE = 'admin:update',
  ADMIN_DELETE = 'admin:delete',
  
  // Billing
  BILLING_READ = 'billing:read',
  BILLING_UPDATE = 'billing:update',
  BILLING_ADMIN = 'billing:admin',
  
  // Analytics
  ANALYTICS_READ = 'analytics:read',
  ANALYTICS_EXPORT = 'analytics:export',
  ANALYTICS_ADMIN = 'analytics:admin',
  
  // API access
  API_READ = 'api:read',
  API_WRITE = 'api:write',
  API_ADMIN = 'api:admin'
}

// Tenant-related enums
export enum TenantType {
  AGRI_COMPANY = 'agri_company',
  COOPERATIVE = 'cooperative',
  GOVERNMENT = 'government',
  NGO = 'ngo',
  RESEARCH = 'research',
  INDIVIDUAL = 'individual'
}

export enum TenantStatus {
  ACTIVE = 'active',
  TRIAL = 'trial',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
  ARCHIVED = 'archived'
}

export enum SubscriptionPlan {
  KISAN_BASIC = 'Kisan_Basic',
  SHAKTI_GROWTH = 'Shakti_Growth',
  AI_ENTERPRISE = 'AI_Enterprise'
}
