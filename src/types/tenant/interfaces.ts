
import { TenantType, TenantStatus, SubscriptionPlan, TenantStatusValue, TenantTypeValue, SubscriptionPlanValue } from './enums';

// Branded type for tenant ID to prevent mixing with generic strings
export type TenantID = string & { readonly brand: unique symbol };

export const createTenantID = (id: string): TenantID => id as TenantID;

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

// RPC Response type for database operations
export interface RpcResponse {
  success: boolean;
  error?: string;
  message?: string;
  tenant_id?: string;
  data?: any;
}
