
import { 
  TenantType, 
  TenantStatus, 
  SubscriptionPlan,
  TenantTypeValue,
  TenantStatusValue,
  SubscriptionPlanValue
} from '@/types/enums';

export const mapTenantTypeToDisplay = (type: TenantTypeValue): string => {
  const displayMap: Record<TenantTypeValue, string> = {
    [TenantType.AGRI_COMPANY]: 'Agriculture Company',
    [TenantType.DEALER]: 'Dealer Network',
    [TenantType.COOPERATIVE]: 'Cooperative Society',
    [TenantType.UNIVERSITY]: 'University/Research',
    [TenantType.SUGAR_FACTORY]: 'Sugar Factory',
    [TenantType.GOVERNMENT]: 'Government Entity',
    [TenantType.INSURANCE]: 'Insurance Provider',
    [TenantType.OTHER]: 'Other'
  };
  return displayMap[type] || type;
};

export const mapTenantStatusToDisplay = (status: TenantStatusValue): string => {
  const displayMap: Record<TenantStatusValue, string> = {
    [TenantStatus.TRIAL]: 'Trial',
    [TenantStatus.ACTIVE]: 'Active',
    [TenantStatus.SUSPENDED]: 'Suspended',
    [TenantStatus.ARCHIVED]: 'Archived',
    [TenantStatus.PENDING_APPROVAL]: 'Pending Approval',
    [TenantStatus.CANCELLED]: 'Cancelled'
  };
  return displayMap[status] || status;
};

export const mapSubscriptionPlanToDisplay = (plan: SubscriptionPlanValue): string => {
  const displayMap: Record<SubscriptionPlanValue, string> = {
    [SubscriptionPlan.KISAN_BASIC]: 'Kisan Basic',
    [SubscriptionPlan.SHAKTI_GROWTH]: 'Shakti Growth',
    [SubscriptionPlan.AI_ENTERPRISE]: 'AI Enterprise',
    [SubscriptionPlan.CUSTOM_ENTERPRISE]: 'Custom Enterprise'
  };
  return displayMap[plan] || plan;
};
