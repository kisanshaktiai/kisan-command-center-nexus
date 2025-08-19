import { TenantType, TenantStatus, SubscriptionPlan, TenantTypeValue, TenantStatusValue, SubscriptionPlanValue } from './enums';

// Base tenant interface
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  type: TenantTypeValue;
  status: TenantStatusValue;
  subscription_plan: SubscriptionPlanValue;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  business_registration?: string;
  business_address?: Record<string, any>;
  established_date?: string;
  subscription_start_date?: string;
  subscription_end_date?: string;
  trial_ends_at?: string;
  suspended_at?: string;
  reactivated_at?: string;
  archived_at?: string;
  max_farmers?: number;
  max_dealers?: number;
  max_products?: number;
  max_storage_gb?: number;
  max_api_calls_per_day?: number;
  subdomain?: string;
  custom_domain?: string;
  branding_version?: number;
  branding_updated_at?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  
  // Relations - these are loaded separately and attached
  branding?: TenantBranding | null;
  features?: TenantFeatures | null;
  tenant_subscriptions?: any[];
  tenant_features?: any[];
  tenant_branding?: any[];
}

// Form data interface
export interface TenantFormData {
  name: string;
  slug: string;
  type: TenantTypeValue;
  status: TenantStatusValue;
  subscription_plan: SubscriptionPlanValue;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  business_registration?: string;
  business_address?: Record<string, any>;
  established_date?: string;
  subscription_start_date?: string;
  subscription_end_date?: string;
  trial_ends_at?: string;
  max_farmers?: number;
  max_dealers?: number;
  max_products?: number;
  max_storage_gb?: number;
  max_api_calls_per_day?: number;
  subdomain?: string;
  custom_domain?: string;
  metadata?: Record<string, any>;
}

// Additional interfaces for compatibility
export interface TenantBranding {
  id?: string;
  tenant_id?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  app_name?: string;
  app_tagline?: string;
  logo_url?: string;
  favicon_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TenantFeatures {
  id?: string;
  tenant_id?: string;
  ai_chat?: boolean;
  weather_forecast?: boolean;
  marketplace?: boolean;
  community_forum?: boolean;
  satellite_imagery?: boolean;
  soil_testing?: boolean;
  drone_monitoring?: boolean;
  iot_integration?: boolean;
  ecommerce?: boolean;
  payment_gateway?: boolean;
  inventory_management?: boolean;
  logistics_tracking?: boolean;
  basic_analytics?: boolean;
  advanced_analytics?: boolean;
  predictive_analytics?: boolean;
  custom_reports?: boolean;
  api_access?: boolean;
  webhook_support?: boolean;
  third_party_integrations?: boolean;
  white_label_mobile_app?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Utility types
export type TenantID = string;

export const createTenantID = (id: string): TenantID => id;

// DTO interfaces
export interface CreateTenantDTO {
  name: string;
  slug: string;
  type?: TenantTypeValue;
  status?: TenantStatusValue;
  subscription_plan?: SubscriptionPlanValue;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  business_registration?: string;
  business_address?: Record<string, any>;
  established_date?: string;
  subscription_start_date?: string;
  subscription_end_date?: string;
  trial_ends_at?: string;
  max_farmers?: number;
  max_dealers?: number;
  max_products?: number;
  max_storage_gb?: number;
  max_api_calls_per_day?: number;
  subdomain?: string;
  custom_domain?: string;
  metadata?: Record<string, any>;
}

export interface UpdateTenantDTO {
  name?: string;
  slug?: string;
  type?: TenantTypeValue;
  status?: TenantStatusValue;
  subscription_plan?: SubscriptionPlanValue;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  business_registration?: string;
  business_address?: Record<string, any>;
  established_date?: string;
  subscription_start_date?: string;
  subscription_end_date?: string;
  trial_ends_at?: string;
  suspended_at?: string;
  reactivated_at?: string;
  archived_at?: string;
  max_farmers?: number;
  max_dealers?: number;
  max_products?: number;
  max_storage_gb?: number;
  max_api_calls_per_day?: number;
  subdomain?: string;
  custom_domain?: string;
  metadata?: Record<string, any>;
}

export interface TenantFilters {
  search?: string;
  type?: TenantTypeValue;
  status?: TenantStatusValue;
  subscription_plan?: SubscriptionPlanValue;
}

// Options for dropdowns
export const tenantTypeOptions = [
  { value: TenantType.AGRI_COMPANY, label: 'Agriculture Company' },
  { value: TenantType.DEALER, label: 'Dealer Network' },
  { value: TenantType.COOPERATIVE, label: 'Cooperative Society' },
  { value: TenantType.UNIVERSITY, label: 'University/Research' },
  { value: TenantType.SUGAR_FACTORY, label: 'Sugar Factory' },
  { value: TenantType.GOVERNMENT, label: 'Government Entity' },
  { value: TenantType.INSURANCE, label: 'Insurance Provider' },
  { value: TenantType.NGO, label: 'NGO' }
];

export const tenantStatusOptions = [
  { value: TenantStatus.TRIAL, label: 'Trial' },
  { value: TenantStatus.ACTIVE, label: 'Active' },
  { value: TenantStatus.SUSPENDED, label: 'Suspended' },
  { value: TenantStatus.ARCHIVED, label: 'Archived' },
  { value: TenantStatus.PENDING_APPROVAL, label: 'Pending Approval' },
  { value: TenantStatus.CANCELLED, label: 'Cancelled' }
];

// Database raw type converter
export function convertDatabaseTenant(raw: any): Tenant {
  // Safely parse business_address if it's a string
  let businessAddress: Record<string, any> = {};
  if (raw.business_address) {
    if (typeof raw.business_address === 'string') {
      try {
        businessAddress = JSON.parse(raw.business_address);
      } catch {
        businessAddress = {};
      }
    } else if (typeof raw.business_address === 'object') {
      businessAddress = raw.business_address;
    }
  }

  // Safely parse metadata
  let metadata: Record<string, any> = {};
  if (raw.metadata) {
    if (typeof raw.metadata === 'string') {
      try {
        metadata = JSON.parse(raw.metadata);
      } catch {
        metadata = {};
      }
    } else if (typeof raw.metadata === 'object') {
      metadata = raw.metadata;
    }
  }

  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    type: raw.type as TenantTypeValue,
    status: raw.status as TenantStatusValue,
    subscription_plan: raw.subscription_plan as SubscriptionPlanValue,
    owner_name: raw.owner_name,
    owner_email: raw.owner_email,
    owner_phone: raw.owner_phone,
    business_registration: raw.business_registration,
    business_address: businessAddress,
    established_date: raw.established_date,
    subscription_start_date: raw.subscription_start_date,
    subscription_end_date: raw.subscription_end_date,
    trial_ends_at: raw.trial_ends_at,
    suspended_at: raw.suspended_at,
    reactivated_at: raw.reactivated_at,
    archived_at: raw.archived_at,
    max_farmers: raw.max_farmers,
    max_dealers: raw.max_dealers,
    max_products: raw.max_products,
    max_storage_gb: raw.max_storage_gb,
    max_api_calls_per_day: raw.max_api_calls_per_day,
    subdomain: raw.subdomain,
    custom_domain: raw.custom_domain,
    branding_version: raw.branding_version,
    branding_updated_at: raw.branding_updated_at,
    metadata: metadata,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    tenant_subscriptions: raw.tenant_subscriptions,
    tenant_features: raw.tenant_features,
    tenant_branding: raw.tenant_branding,
    
    // Extract branding and features from relations if available
    branding: raw.tenant_branding?.[0] || null,
    features: raw.tenant_features?.[0] || null,
  };
}

// Helper functions for display
export function getTenantTypeDisplay(type: TenantTypeValue): string {
  const displayMap: Record<TenantTypeValue, string> = {
    [TenantType.AGRI_COMPANY]: 'Agriculture Company',
    [TenantType.DEALER]: 'Dealer Network',
    [TenantType.COOPERATIVE]: 'Cooperative Society',
    [TenantType.UNIVERSITY]: 'University/Research',
    [TenantType.SUGAR_FACTORY]: 'Sugar Factory',
    [TenantType.GOVERNMENT]: 'Government Entity',
    [TenantType.INSURANCE]: 'Insurance Provider',
    [TenantType.NGO]: 'NGO'
  };
  return displayMap[type] || type;
}

export function getTenantStatusDisplay(status: TenantStatusValue): string {
  const displayMap: Record<TenantStatusValue, string> = {
    [TenantStatus.TRIAL]: 'Trial',
    [TenantStatus.ACTIVE]: 'Active',
    [TenantStatus.SUSPENDED]: 'Suspended',
    [TenantStatus.ARCHIVED]: 'Archived',
    [TenantStatus.PENDING_APPROVAL]: 'Pending Approval',
    [TenantStatus.CANCELLED]: 'Cancelled'
  };
  return displayMap[status] || status;
}

export function getSubscriptionPlanDisplay(plan: SubscriptionPlanValue): string {
  const displayMap: Record<SubscriptionPlanValue, string> = {
    [SubscriptionPlan.KISAN_BASIC]: 'Kisan Basic',
    [SubscriptionPlan.SHAKTI_GROWTH]: 'Shakti Growth',
    [SubscriptionPlan.AI_ENTERPRISE]: 'AI Enterprise',
    [SubscriptionPlan.CUSTOM_ENTERPRISE]: 'Custom Enterprise'
  };
  return displayMap[plan] || plan;
}

export function convertEnumToString(enumValue: any): string {
  return String(enumValue);
}

// Re-export enums for convenience
export { TenantType, TenantStatus, SubscriptionPlan, type TenantTypeValue, type TenantStatusValue, type SubscriptionPlanValue };
