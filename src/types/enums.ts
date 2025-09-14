
// Centralized enums for type safety
export enum TenantType {
  AGRI_COMPANY = 'agri_company',
  DEALER = 'dealer',
  NGO = 'ngo',
  GOVERNMENT = 'government',
  UNIVERSITY = 'university',
  SUGAR_FACTORY = 'sugar_factory',
  COOPERATIVE = 'cooperative',
  INSURANCE = 'insurance'
}

export enum TenantStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
  ARCHIVED = 'archived',
  PENDING_APPROVAL = 'pending_approval'
}

export enum SubscriptionPlan {
  KISAN_BASIC = 'Kisan_Basic',
  SHAKTI_GROWTH = 'Shakti_Growth',
  AI_ENTERPRISE = 'AI_Enterprise',
  CUSTOM = 'custom'
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  PLATFORM_ADMIN = 'platform_admin',
  TENANT_ADMIN = 'tenant_admin',
  TENANT_USER = 'tenant_user',
  FARMER = 'farmer',
  DEALER = 'dealer'
}

export enum Permission {
  // System permissions
  SYSTEM_ADMIN = 'system:admin',
  SYSTEM_CONFIG = 'system:config',
  
  // Tenant permissions
  TENANT_CREATE = 'tenant:create',
  TENANT_READ = 'tenant:read',
  TENANT_UPDATE = 'tenant:update',
  TENANT_DELETE = 'tenant:delete',
  
  // User permissions
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  
  // Billing permissions
  BILLING_READ = 'billing:read',
  BILLING_UPDATE = 'billing:update',
  BILLING_ADMIN = 'billing:admin'
}
