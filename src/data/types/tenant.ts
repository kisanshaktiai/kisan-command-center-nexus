
import { SubscriptionPlan, TenantType, TenantStatus } from '@/types/tenant';

export interface TenantDTO {
  id: string;
  name: string;
  slug: string;
  type: TenantType;
  status: TenantStatus;
  subscription_plan: SubscriptionPlan;
  created_at: string;
  updated_at: string;
  owner_email?: string;
  owner_name?: string;
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

export interface CreateTenantDTO {
  name: string;
  slug: string;
  type: TenantType;
  subscription_plan: SubscriptionPlan;
  owner_email: string;
  owner_name: string;
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
  status?: TenantStatus;
  subscription_plan?: SubscriptionPlan;
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
