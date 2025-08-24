
import { TenantStatusValue, TenantTypeValue, SubscriptionPlanValue } from './enums';

export interface CreateTenantDTO {
  name: string;
  slug: string;
  type: TenantTypeValue;
  status: TenantStatusValue;
  subscription_plan: SubscriptionPlanValue;
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

export interface UpdateTenantDTO {
  name?: string;
  type?: TenantTypeValue;
  status?: TenantStatusValue;
  subscription_plan?: SubscriptionPlanValue;
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
}
