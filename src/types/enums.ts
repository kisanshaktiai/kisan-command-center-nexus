
// Core system enums aligned with database

export enum TenantType {
  AGRI_COMPANY = 'agri_company',
  DEALER = 'dealer',
  COOPERATIVE = 'cooperative',
  UNIVERSITY = 'university',
  SUGAR_FACTORY = 'sugar_factory',
  GOVERNMENT = 'government',
  INSURANCE = 'insurance',
  NGO = 'ngo' // Changed from OTHER to NGO to match database
}

export enum TenantStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  ARCHIVED = 'archived',
  PENDING_APPROVAL = 'pending_approval',
  CANCELLED = 'cancelled'  // This matches the database schema
}

export enum SubscriptionPlan {
  KISAN_BASIC = 'Kisan_Basic',
  SHAKTI_GROWTH = 'Shakti_Growth',
  AI_ENTERPRISE = 'AI_Enterprise',
  CUSTOM_ENTERPRISE = 'custom'  // This matches the database schema
}

// Type aliases for compatibility
export type TenantTypeValue = `${TenantType}`;
export type TenantStatusValue = `${TenantStatus}`;
export type SubscriptionPlanValue = `${SubscriptionPlan}`;

// Permission system
export enum Permission {
  // System permissions
  SYSTEM_ADMIN = 'system:*',
  SYSTEM_READ = 'system:read',
  SYSTEM_WRITE = 'system:write',
  
  // Tenant permissions
  TENANT_ADMIN = 'tenant:*',
  TENANT_READ = 'tenant:read',
  TENANT_WRITE = 'tenant:write',
  TENANT_DELETE = 'tenant:delete',
  
  // User permissions
  USER_ADMIN = 'user:*',
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_DELETE = 'user:delete',
  
  // Billing permissions
  BILLING_ADMIN = 'billing:*',
  BILLING_READ = 'billing:read',
  BILLING_WRITE = 'billing:write',
  
  // Analytics permissions
  ANALYTICS_ADMIN = 'analytics:*',
  ANALYTICS_READ = 'analytics:read',
  ANALYTICS_WRITE = 'analytics:write',
  
  // Product permissions
  PRODUCTS_READ = 'products:read',
  PRODUCTS_WRITE = 'products:write',
  
  // Customer permissions
  CUSTOMERS_READ = 'customers:read',
  CUSTOMERS_WRITE = 'customers:write',
  
  // Order permissions
  ORDERS_READ = 'orders:read',
  ORDERS_WRITE = 'orders:write',
  
  // Commission permissions
  COMMISSION_READ = 'commission:read',
  COMMISSION_WRITE = 'commission:write',
  
  // Farmer permissions
  FARMERS_READ = 'farmers:read',
  FARMERS_WRITE = 'farmers:write',
  
  // Task permissions
  TASKS_READ = 'tasks:read',
  TASKS_WRITE = 'tasks:write',
  
  // Report permissions
  REPORTS_READ = 'reports:read',
  REPORTS_WRITE = 'reports:write',
  
  // Profile permissions
  PROFILE_READ = 'profile:read',
  PROFILE_WRITE = 'profile:write',
  
  // Crop permissions
  CROPS_READ = 'crops:read',
  CROPS_WRITE = 'crops:write',
  
  // Weather permissions
  WEATHER_READ = 'weather:read',
  
  // Marketplace permissions
  MARKETPLACE_READ = 'marketplace:read',
  MARKETPLACE_WRITE = 'marketplace:write',
  
  // Dashboard permissions
  DASHBOARD_READ = 'dashboard:read',
  DASHBOARD_WRITE = 'dashboard:write',
  
  // API permissions
  API_READ = 'api:read',
  API_WRITE = 'api:write',
  API_ADMIN = 'api:admin'
}

// Role system enums
export enum SystemRoleCode {
  SUPER_ADMIN = 'super_admin',
  PLATFORM_ADMIN = 'platform_admin',
  TENANT_OWNER = 'tenant_owner',
  TENANT_ADMIN = 'tenant_admin',
  TENANT_MANAGER = 'tenant_manager',
  DEALER = 'dealer',
  AGENT = 'agent',
  FARMER = 'farmer',
  TENANT_USER = 'tenant_user'
}

export type SystemRoleCodeValue = `${SystemRoleCode}`;
