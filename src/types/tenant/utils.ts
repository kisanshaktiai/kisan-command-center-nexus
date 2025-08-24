
import { TenantType, TenantStatus, SubscriptionPlan, TenantStatusValue, TenantTypeValue, SubscriptionPlanValue } from './enums';

// Enum to string converters for API calls
export const convertEnumToString = {
  type: (type: TenantType): TenantTypeValue => type as TenantTypeValue,
  status: (status: TenantStatus): TenantStatusValue => status as TenantStatusValue,
  subscriptionPlan: (plan: SubscriptionPlan): SubscriptionPlanValue => plan as SubscriptionPlanValue,
};
