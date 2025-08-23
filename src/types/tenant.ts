// Import from centralized enums and types
export * from './enums';

// Base tenant interface with all properties
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  subscription_plan: string;
  created_at: string;
  updated_at: string;
  
  // Contact and owner information
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  contact_email?: string;
  contact_phone?: string;
  
  // Business information
  organization_name?: string;
  business_registration?: string;
  business_address?: string;
  established_date?: string;
  
  // Subscription details
  subscription_start_date?: string;
  subscription_end_date?: string;
  trial_ends_at?: string;
  
  // Limits and quotas
  max_farmers?: number;
  max_dealers?: number;
  max_products?: number;
  max_storage_gb?: number;
  max_api_calls_per_day?: number;
  
  // Domain settings
  subdomain?: string;
  custom_domain?: string;
  
  // Branding and customization
  branding?: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
    app_name?: string;
    app_tagline?: string;
    theme_settings?: Record<string, unknown>;
  };
  
  // Additional settings
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// Additional branding interface
export interface TenantBranding {
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  app_name?: string;
  app_tagline?: string;
  theme_settings?: Record<string, unknown>;
}

// Features interface
export interface TenantFeatures {
  [key: string]: boolean | string | number;
}

// Tenant ID type
export type TenantID = string;

// Create tenant ID function
export const createTenantID = (id: string): TenantID => id;

export interface TenantFilters {
  search?: string;
  type?: string;
  status?: string;
  subscription_plan?: string;
}

export interface CreateTenantDTO {
  name: string;
  slug: string;
  type: string;
  
  // Optional owner information
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  
  // Optional business information
  organization_name?: string;
  business_registration?: string;
  business_address?: string;
  established_date?: string;
  
  // Optional subscription details
  subscription_start_date?: string;
  subscription_end_date?: string;
  trial_ends_at?: string;
  
  // Optional limits
  max_farmers?: number;
  max_dealers?: number;
  max_products?: number;
  max_storage_gb?: number;
  max_api_calls_per_day?: number;
  
  // Optional domain settings
  subdomain?: string;
  custom_domain?: string;
  
  // Optional settings
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface UpdateTenantDTO {
  id: string;
  name?: string;
  slug?: string;
  type?: string;
  status?: string;
  subscription_plan?: string;
  
  // Optional owner information
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  
  // Optional business information
  organization_name?: string;
  business_registration?: string;
  business_address?: string;
  established_date?: string;
  
  // Optional subscription details
  subscription_start_date?: string;
  subscription_end_date?: string;
  trial_ends_at?: string;
  
  // Optional limits
  max_farmers?: number;
  max_dealers?: number;
  max_products?: number;
  max_storage_gb?: number;
  max_api_calls_per_day?: number;
  
  // Optional domain settings
  subdomain?: string;
  custom_domain?: string;
  
  // Optional settings
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface DatabaseTenant {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  subscription_plan: string;
  organization_name: string | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  business_registration: string | null;
  business_address: any | null;
  established_date: string | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  trial_ends_at: string | null;
  max_farmers: number | null;
  max_dealers: number | null;
  max_products: number | null;
  max_storage_gb: number | null;
  max_api_calls_per_day: number | null;
  subdomain: string | null;
  custom_domain: string | null;
  settings: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  tenant_branding?: Array<{
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
    app_name?: string;
    app_tagline?: string;
    theme_settings?: Record<string, unknown>;
  }>;
  tenant_features?: Array<Record<string, unknown>>;
}

// Form data interface for create/edit forms
export interface TenantFormData {
  name: string;
  slug: string;
  type: string;
  status: string;
  subscription_plan: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  organization_name?: string;
  business_registration?: string;
  business_address?: string | {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
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
  metadata?: Record<string, unknown>;
}

// Option interfaces for select components  
export const tenantTypeOptions = [
  { value: 'Agri_Company', label: 'Agri Company' },
  { value: 'Farmer_Collective', label: 'Farmer Collective' },
  { value: 'Cooperative', label: 'Cooperative' },
  { value: 'Government_Agency', label: 'Government Agency' },
  { value: 'NGO', label: 'NGO' },
  { value: 'Research_Institute', label: 'Research Institute' },
  { value: 'Technology_Provider', label: 'Technology Provider' },
  { value: 'Financial_Institution', label: 'Financial Institution' },
  { value: 'Marketplace', label: 'Marketplace' },
  { value: 'Consultant', label: 'Consultant' }
];

export const tenantStatusOptions = [
  { value: 'trial', label: 'Trial' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'archived', label: 'Archived' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'cancelled', label: 'Cancelled' }
];

export const subscriptionPlanOptions = [
  { value: 'Kisan_Basic', label: 'Kisan Basic' },
  { value: 'Shakti_Growth', label: 'Shakti Growth' },
  { value: 'AI_Enterprise', label: 'AI Enterprise' },
  { value: 'Custom_Enterprise', label: 'Custom Enterprise' }
];

// Type aliases for enum values
export type TenantTypeValue = string;
export type TenantStatusValue = string;
export type SubscriptionPlanValue = string;

// Conversion function from database format to application format
export const convertDatabaseTenant = (dbTenant: any): Tenant => {
  const branding = dbTenant.tenant_branding?.[0] || {};
  
  return {
    id: dbTenant.id,
    name: dbTenant.name,
    slug: dbTenant.slug,
    type: dbTenant.type,
    status: dbTenant.status,
    subscription_plan: dbTenant.subscription_plan,
    created_at: dbTenant.created_at,
    updated_at: dbTenant.updated_at,
    organization_name: dbTenant.organization_name || undefined,
    owner_name: dbTenant.owner_name || undefined,
    owner_email: dbTenant.owner_email || undefined,
    owner_phone: dbTenant.owner_phone || undefined,
    contact_email: dbTenant.contact_email || undefined,
    contact_phone: dbTenant.contact_phone || undefined,
    business_registration: dbTenant.business_registration || undefined,
    business_address: dbTenant.business_address || undefined,
    established_date: dbTenant.established_date || undefined,
    subscription_start_date: dbTenant.subscription_start_date || undefined,
    subscription_end_date: dbTenant.subscription_end_date || undefined,
    trial_ends_at: dbTenant.trial_ends_at || undefined,
    max_farmers: dbTenant.max_farmers || undefined,
    max_dealers: dbTenant.max_dealers || undefined,
    max_products: dbTenant.max_products || undefined,
    max_storage_gb: dbTenant.max_storage_gb || undefined,
    max_api_calls_per_day: dbTenant.max_api_calls_per_day || undefined,
    subdomain: dbTenant.subdomain || undefined,
    custom_domain: dbTenant.custom_domain || undefined,
    settings: dbTenant.settings || undefined,
    metadata: dbTenant.metadata || undefined,
    branding: Object.keys(branding).length > 0 ? {
      logo_url: branding.logo_url,
      primary_color: branding.primary_color,
      secondary_color: branding.secondary_color,
      app_name: branding.app_name,
      app_tagline: branding.app_tagline,
      theme_settings: branding.theme_settings,
    } : undefined,
  };
};
