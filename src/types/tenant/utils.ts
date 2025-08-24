
import { TenantType, TenantStatus, SubscriptionPlan, TenantStatusValue, TenantTypeValue, SubscriptionPlanValue } from './enums';
import { Tenant, TenantID, createTenantID } from './interfaces';

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

