import { TenantType, TenantStatus, SubscriptionPlan } from './enums';

// Branded type for tenant ID to prevent mixing with generic strings
export type TenantID = string & { readonly brand: unique symbol };

export const createTenantID = (id: string): TenantID => id as TenantID;

// Strict status union type matching Supabase schema
export type TenantStatusValue = "active" | "trial" | "suspended" | "cancelled" | "archived" | "pending_approval";
export type TenantTypeValue = "agri_company" | "dealer" | "ngo" | "government" | "university" | "sugar_factory" | "cooperative" | "insurance";
export type SubscriptionPlanValue = "Kisan_Basic" | "Shakti_Growth" | "AI_Enterprise" | "custom";

export interface TenantFormData {
  name: string;
  slug: string;
  type: TenantType;
  status: TenantStatus;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  business_registration?: string;
  business_address?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  established_date?: string;
  subscription_plan: SubscriptionPlan;
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

export interface CreateTenantDTO {
  name: string;
  slug: string;
  type: TenantTypeValue; // Strict union type for database
  status: TenantStatusValue; // Strict union type for database
  subscription_plan: SubscriptionPlanValue; // Strict union type for database
  owner_email?: string; // Made optional to match TenantFormData
  owner_name?: string; // Made optional to match TenantFormData
  owner_phone?: string;
  business_registration?: string;
  business_address?: any;
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
  type?: TenantTypeValue; // Strict union type for database
  status?: TenantStatusValue; // Strict union type for database
  subscription_plan?: SubscriptionPlanValue; // Strict union type for database
  owner_name?: string; // Added missing field
  owner_email?: string; // Added missing field
  owner_phone?: string;
  business_registration?: string;
  business_address?: any;
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

export interface TenantFilters {
  search?: string;
  type?: TenantType | TenantTypeValue | string;
  status?: TenantStatus | TenantStatusValue | string;
  subscription_plan?: SubscriptionPlan | SubscriptionPlanValue | string;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface Tenant {
  id: TenantID;
  name: string;
  slug: string;
  type: TenantType;
  status: TenantStatus;
  subscription_plan: SubscriptionPlan;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  business_registration?: string;
  business_address?: any;
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
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  branding?: TenantBranding | null;
  features?: TenantFeatures | null;
}

export interface TenantBranding {
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  background_color?: string;
  text_color?: string;
  app_name?: string;
  app_tagline?: string;
  logo_url?: string;
  font_family?: string;
}

export interface TenantFeatures {
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
}

// RPC Response type for database operations
export interface RpcResponse {
  success: boolean;
  error?: string;
  message?: string;
  tenant_id?: string;
  data?: any;
}

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

// Type conversion utilities
export const convertDatabaseTenant = (dbTenant: any): Tenant => {
  return {
    ...dbTenant,
    id: createTenantID(dbTenant.id),
    type: Object.values(TenantType).find(t => t === dbTenant.type) || TenantType.AGRI_COMPANY,
    status: Object.values(TenantStatus).find(s => s === dbTenant.status) || TenantStatus.TRIAL,
    subscription_plan: Object.values(SubscriptionPlan).find(p => p === dbTenant.subscription_plan) || SubscriptionPlan.KISAN_BASIC,
    branding: dbTenant.tenant_branding?.[0] || null,
    features: dbTenant.tenant_features?.[0] || null,
  };
};

// Enum to string converters for API calls
export const convertEnumToString = {
  type: (type: TenantType): TenantTypeValue => type as TenantTypeValue,
  status: (status: TenantStatus): TenantStatusValue => status as TenantStatusValue,
  subscriptionPlan: (plan: SubscriptionPlan): SubscriptionPlanValue => plan as SubscriptionPlanValue,
};

// Re-export enums for convenience
export { TenantType, TenantStatus, SubscriptionPlan };
