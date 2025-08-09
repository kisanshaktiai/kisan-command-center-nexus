
import { TenantStatus, TenantType, SubscriptionPlan } from '@/types/enums';

export const mapTenantTypeToDisplay = (type: TenantType): string => {
  const mapping = {
    [TenantType.AGRI_COMPANY]: 'Agricultural Company',
    [TenantType.DEALER]: 'Dealer',
    [TenantType.NGO]: 'NGO',
    [TenantType.GOVERNMENT]: 'Government',
    [TenantType.UNIVERSITY]: 'University',
    [TenantType.SUGAR_FACTORY]: 'Sugar Factory',
    [TenantType.COOPERATIVE]: 'Cooperative',
    [TenantType.INSURANCE]: 'Insurance',
  };
  return mapping[type] || type;
};

export const mapTenantStatusToDisplay = (status: TenantStatus): string => {
  const mapping = {
    [TenantStatus.TRIAL]: 'Trial',
    [TenantStatus.ACTIVE]: 'Active',
    [TenantStatus.SUSPENDED]: 'Suspended',
    [TenantStatus.CANCELLED]: 'Cancelled',
    [TenantStatus.ARCHIVED]: 'Archived',
    [TenantStatus.PENDING_APPROVAL]: 'Pending Approval',
  };
  return mapping[status] || status;
};

export const mapSubscriptionPlanToDisplay = (plan: SubscriptionPlan): string => {
  const mapping = {
    [SubscriptionPlan.KISAN_BASIC]: 'Kisan – Starter',
    [SubscriptionPlan.SHAKTI_GROWTH]: 'Shakti – Growth',
    [SubscriptionPlan.AI_ENTERPRISE]: 'AI – Enterprise',
    [SubscriptionPlan.CUSTOM]: 'Custom Plan',
  };
  return mapping[plan] || plan;
};
