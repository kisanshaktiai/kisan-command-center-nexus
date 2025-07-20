
// Tenant type definitions  
export type SubscriptionPlan = 'starter' | 'growth' | 'enterprise' | 'custom';
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
    name: string;
    slug: string;
    status: string;
    subscription_plan: string;
    trial_ends_at: string;
    limits: Record<string, any>;
    features_enabled: Record<string, any>;
  };
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  type: TenantType;
  status: TenantStatus | null;
  subscription_plan: SubscriptionPlan | null;
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
  created_at?: string;
  updated_at?: string;
}

export const subscriptionPlanOptions: { value: SubscriptionPlan; label: string }[] = [
  { value: 'starter', label: 'Kisan – Starter' },
  { value: 'growth', label: 'Shakti – Growth' },
  { value: 'enterprise', label: 'AI – Enterprise' },
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
