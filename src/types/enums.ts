
// Tenant Type Enumeration
export enum TenantType {
  AGRI_COMPANY = 'Agri_Company',
  FARMER_COLLECTIVE = 'Farmer_Collective',
  COOPERATIVE = 'Cooperative',
  GOVERNMENT_AGENCY = 'Government_Agency',
  NGO = 'NGO',
  RESEARCH_INSTITUTE = 'Research_Institute',
  TECHNOLOGY_PROVIDER = 'Technology_Provider',
  FINANCIAL_INSTITUTION = 'Financial_Institution',
  MARKETPLACE = 'Marketplace',
  CONSULTANT = 'Consultant'
}

// Tenant Status Enumeration
export enum TenantStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  ARCHIVED = 'archived',
  PENDING_APPROVAL = 'pending_approval',
  CANCELLED = 'cancelled'
}

// Subscription Plan Enumeration
export enum SubscriptionPlan {
  KISAN_BASIC = 'Kisan_Basic',
  SHAKTI_GROWTH = 'Shakti_Growth',
  AI_ENTERPRISE = 'AI_Enterprise',
  CUSTOM_ENTERPRISE = 'Custom_Enterprise'
}

// Permission Enumeration for RBAC
export enum Permission {
  READ_TENANT = 'read:tenant',
  WRITE_TENANT = 'write:tenant',
  DELETE_TENANT = 'delete:tenant',
  MANAGE_USERS = 'manage:users',
  READ_ANALYTICS = 'read:analytics',
  MANAGE_SETTINGS = 'manage:settings',
  SYSTEM_ADMIN = 'system:admin'
}

// Type aliases for convenience
export type TenantTypeValue = `${TenantType}`;
export type TenantStatusValue = `${TenantStatus}`;
export type SubscriptionPlanValue = `${SubscriptionPlan}`;
export type PermissionValue = `${Permission}`;
