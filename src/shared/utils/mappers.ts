
import { TenantType, TenantStatus } from '@/types/enums';

export const mapTenantTypeToDisplay = (type: string): string => {
  const typeMap: Record<string, string> = {
    [TenantType.AGRI_COMPANY]: 'Agriculture Company',
    [TenantType.DEALER]: 'Dealer Network',
    [TenantType.COOPERATIVE]: 'Cooperative Society',
    [TenantType.UNIVERSITY]: 'University/Research',
    [TenantType.SUGAR_FACTORY]: 'Sugar Factory',
    [TenantType.GOVERNMENT]: 'Government Entity',
    [TenantType.INSURANCE]: 'Insurance Provider',
    [TenantType.OTHER]: 'Other'
  };
  return typeMap[type] || type;
};

export const mapTenantStatusToDisplay = (status: string): string => {
  const statusMap: Record<string, string> = {
    [TenantStatus.TRIAL]: 'Trial',
    [TenantStatus.ACTIVE]: 'Active',
    [TenantStatus.SUSPENDED]: 'Suspended',
    [TenantStatus.ARCHIVED]: 'Archived',
    [TenantStatus.PENDING_APPROVAL]: 'Pending Approval',
    [TenantStatus.EXPIRED]: 'Expired'
  };
  return statusMap[status] || status;
};

export const mapTenantStatusToColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    [TenantStatus.TRIAL]: 'bg-blue-100 text-blue-800',
    [TenantStatus.ACTIVE]: 'bg-green-100 text-green-800',
    [TenantStatus.SUSPENDED]: 'bg-red-100 text-red-800',
    [TenantStatus.ARCHIVED]: 'bg-gray-100 text-gray-800',
    [TenantStatus.PENDING_APPROVAL]: 'bg-yellow-100 text-yellow-800',
    [TenantStatus.EXPIRED]: 'bg-orange-100 text-orange-800'
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800';
};
