
// Update enums to match system_roles table structure
export enum TenantType {
  AGRI_COMPANY = 'agri_company',
  COOPERATIVE = 'cooperative',
  GOVERNMENT = 'government',
  NGO = 'ngo',
  RESEARCH = 'research',
  STARTUP = 'startup'
}

export enum TenantStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
  ARCHIVED = 'archived'
}

export enum SubscriptionPlan {
  KISAN_BASIC = 'Kisan_Basic',
  SHAKTI_GROWTH = 'Shakti_Growth',
  AI_ENTERPRISE = 'AI_Enterprise',
  CUSTOM = 'Custom'
}

// Permission system from system_roles table
export enum Permission {
  // System-wide permissions
  SYSTEM_ADMIN = 'system:*',
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_METRICS = 'system:metrics',
  
  // Tenant management
  TENANT_ALL = 'tenant:*',
  TENANT_ADMIN = 'tenant:admin',
  TENANT_CREATE = 'tenant:create',
  TENANT_READ = 'tenant:read',
  TENANT_UPDATE = 'tenant:update',
  TENANT_DELETE = 'tenant:delete',
  TENANT_WRITE = 'tenant:write',
  
  // User management
  USER_ALL = 'user:*',
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_WRITE = 'user:write',
  
  // Billing
  BILLING_ALL = 'billing:*',
  BILLING_ADMIN = 'billing:admin',
  BILLING_READ = 'billing:read',
  BILLING_UPDATE = 'billing:update',
  
  // Analytics
  ANALYTICS_ALL = 'analytics:*',
  ANALYTICS_ADMIN = 'analytics:admin',
  ANALYTICS_READ = 'analytics:read',
  ANALYTICS_EXPORT = 'analytics:export',
  
  // API access
  API_ALL = 'api:*',
  API_ADMIN = 'api:admin',
  API_READ = 'api:read',
  API_WRITE = 'api:write',
  
  // Domain specific
  PRODUCTS_READ = 'products:read',
  CUSTOMERS_WRITE = 'customers:write',
  ORDERS_WRITE = 'orders:write',
  COMMISSION_READ = 'commission:read',
  FARMERS_READ = 'farmers:read',
  FARMERS_WRITE = 'farmers:write',
  TASKS_WRITE = 'tasks:write',
  REPORTS_READ = 'reports:read',
  PROFILE_WRITE = 'profile:write',
  CROPS_WRITE = 'crops:write',
  WEATHER_READ = 'weather:read',
  MARKETPLACE_READ = 'marketplace:read',
  DASHBOARD_READ = 'dashboard:read'
}

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  PROPOSAL_SENT = 'proposal_sent',
  NEGOTIATION = 'negotiation',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost',
  CONVERTED = 'converted'
}

export enum LeadSource {
  WEBSITE = 'website',
  REFERRAL = 'referral',
  SOCIAL_MEDIA = 'social_media',
  EMAIL_CAMPAIGN = 'email_campaign',
  COLD_OUTREACH = 'cold_outreach',
  TRADE_SHOW = 'trade_show',
  PARTNER = 'partner',
  OTHER = 'other'
}

export enum LeadPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}
