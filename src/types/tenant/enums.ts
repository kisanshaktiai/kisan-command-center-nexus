
// Core tenant enums - single source of truth
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

// Strict union types matching Supabase schema
export type TenantStatusValue = "active" | "trial" | "suspended" | "cancelled" | "archived" | "pending_approval";
export type TenantTypeValue = "agri_company" | "dealer" | "ngo" | "government" | "university" | "sugar_factory" | "cooperative" | "insurance";
export type SubscriptionPlanValue = "Kisan_Basic" | "Shakti_Growth" | "AI_Enterprise" | "custom";

// Helper options for forms and filters
export const tenantTypeOptions = [
  { value: TenantType.AGRI_COMPANY, label: 'Agricultural Company' },
  { value: TenantType.DEALER, label: 'Dealer' },
  { value: TenantType.NGO, label: 'NGO' },
  { value: TenantType.GOVERNMENT, label: 'Government' },
  { value: TenantType.UNIVERSITY, label: 'University' },
  { value: TenantType.SUGAR_FACTORY, label: 'Sugar Factory' },
  { value: TenantType.COOPERATIVE, label: 'Cooperative' },
  { value: TenantType.INSURANCE, label: 'Insurance' },
];

export const tenantStatusOptions = [
  { value: TenantStatus.TRIAL, label: 'Trial' },
  { value: TenantStatus.ACTIVE, label: 'Active' },
  { value: TenantStatus.SUSPENDED, label: 'Suspended' },
  { value: TenantStatus.CANCELLED, label: 'Cancelled' },
  { value: TenantStatus.ARCHIVED, label: 'Archived' },
  { value: TenantStatus.PENDING_APPROVAL, label: 'Pending Approval' },
];

export const subscriptionPlanOptions = [
  { value: SubscriptionPlan.KISAN_BASIC, label: 'Kisan – Starter' },
  { value: SubscriptionPlan.SHAKTI_GROWTH, label: 'Shakti – Growth' },
  { value: SubscriptionPlan.AI_ENTERPRISE, label: 'AI – Enterprise' },
  { value: SubscriptionPlan.CUSTOM, label: 'Custom Plan' },
];

