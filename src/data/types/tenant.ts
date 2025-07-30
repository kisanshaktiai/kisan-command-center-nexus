
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
}

export interface CreateTenantDTO {
  name: string;
  slug: string;
  type: TenantType;
  subscription_plan: SubscriptionPlan;
  owner_email: string;
  owner_name: string;
  metadata?: Record<string, any>;
}

export interface UpdateTenantDTO {
  name?: string;
  status?: TenantStatus;
  subscription_plan?: SubscriptionPlan;
  metadata?: Record<string, any>;
}
