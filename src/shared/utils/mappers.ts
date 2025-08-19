import { TenantType, TenantStatus, SubscriptionPlan } from '@/types/enums';

// Tenant Type Mappers
export const mapTenantTypeToDisplay = (type: string): string => {
  const typeDisplayMap: Record<string, string> = {
    [TenantType.AGRI_COMPANY]: 'Agriculture Company',
    [TenantType.DEALER]: 'Dealer Network', 
    [TenantType.COOPERATIVE]: 'Cooperative Society',
    [TenantType.UNIVERSITY]: 'University/Research',
    [TenantType.SUGAR_FACTORY]: 'Sugar Factory',
    [TenantType.GOVERNMENT]: 'Government Entity',
    [TenantType.INSURANCE]: 'Insurance Provider',
    [TenantType.NGO]: 'NGO'
  };
  return typeDisplayMap[type] || type;
};

export const mapDisplayToTenantType = (display: string): string => {
  const reverseMap: Record<string, string> = {
    'Agriculture Company': TenantType.AGRI_COMPANY,
    'Dealer Network': TenantType.DEALER,
    'Cooperative Society': TenantType.COOPERATIVE,
    'University/Research': TenantType.UNIVERSITY,
    'Sugar Factory': TenantType.SUGAR_FACTORY,
    'Government Entity': TenantType.GOVERNMENT,
    'Insurance Provider': TenantType.INSURANCE,
    'NGO': TenantType.NGO
  };
  return reverseMap[display] || display;
};

// Tenant Status Mappers
export const mapTenantStatusToDisplay = (status: string): string => {
  const statusDisplayMap: Record<string, string> = {
    [TenantStatus.TRIAL]: 'Trial',
    [TenantStatus.ACTIVE]: 'Active',
    [TenantStatus.SUSPENDED]: 'Suspended',
    [TenantStatus.ARCHIVED]: 'Archived',
    [TenantStatus.PENDING_APPROVAL]: 'Pending Approval',
    [TenantStatus.CANCELLED]: 'Cancelled'
  };
  return statusDisplayMap[status] || status;
};

// Subscription Plan Mappers
export const mapSubscriptionPlanToDisplay = (plan: string): string => {
  const planDisplayMap: Record<string, string> = {
    [SubscriptionPlan.KISAN_BASIC]: 'Kisan Basic',
    [SubscriptionPlan.SHAKTI_GROWTH]: 'Shakti Growth', 
    [SubscriptionPlan.AI_ENTERPRISE]: 'AI Enterprise',
    [SubscriptionPlan.CUSTOM_ENTERPRISE]: 'Custom Enterprise'
  };
  return planDisplayMap[plan] || plan;
};
