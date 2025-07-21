// Tenant type definitions  
export type SubscriptionPlan = 'Kisan_Basic' | 'Shakti_Growth' | 'AI_Enterprise' | 'custom';
export type TenantType = 'agri_company' | 'dealer' | 'ngo' | 'government' | 'university' | 'sugar_factory' | 'cooperative' | 'insurance';
export type TenantStatus = 'trial' | 'active' | 'suspended' | 'cancelled';

export interface TenantFormData {
  name: string;
  slug: string;
  type: TenantType;
  status: TenantStatus;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  business_registration?: string;
  business_address?: any;
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

export interface FormErrors {
  [key: string]: string;
}

export interface RpcResponse {
  success: boolean;
  error?: string;
  message?: string;
  tenant_id?: string;
  code?: string;
  data?: {
    tenant_id: string;
  };
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

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
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
  // Enhanced relations
  branding?: TenantBranding | null;
  features?: TenantFeatures | null;
}

export const subscriptionPlanOptions: { value: SubscriptionPlan; label: string }[] = [
  { value: 'Kisan_Basic', label: 'Kisan – Starter' },
  { value: 'Shakti_Growth', label: 'Shakti – Growth' },
  { value: 'AI_Enterprise', label: 'AI – Enterprise' },
  { value: 'custom', label: 'Custom Plan' },
];

export const tenantTypeOptions: { value: TenantType; label: string }[] = [
  { value: 'agri_company', label: 'Agriculture Company' },
  { value: 'dealer', label: 'Dealer' },
  { value: 'ngo', label: 'NGO' },
  { value: 'government', label: 'Government' },
  { value: 'university', label: 'University' },
  { value: 'sugar_factory', label: 'Sugar Factory' },
  { value: 'cooperative', label: 'Cooperative' },
  { value: 'insurance', label: 'Insurance' },
];

export const tenantStatusOptions: { value: TenantStatus; label: string }[] = [
  { value: 'trial', label: 'Trial' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'cancelled', label: 'Cancelled' },
];
