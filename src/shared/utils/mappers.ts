
import { TenantStatus, TenantType } from '@/types/tenant';

export const tenantMappers = {
  statusToLabel: (status: TenantStatus): string => {
    const statusMap: Record<TenantStatus, string> = {
      active: 'Active',
      trial: 'Trial',
      suspended: 'Suspended',
      cancelled: 'Cancelled',
      archived: 'Archived',
      pending_approval: 'Pending Approval'
    };
    return statusMap[status] || status;
  },

  typeToLabel: (type: TenantType): string => {
    const typeMap: Record<TenantType, string> = {
      agri_company: 'Agriculture Company',
      retailer: 'Retailer',
      distributor: 'Distributor',
      individual: 'Individual',
      cooperative: 'Cooperative'
    };
    return typeMap[type] || type;
  },

  statusToBadgeVariant: (status: TenantStatus) => {
    const variantMap: Record<TenantStatus, string> = {
      active: 'default',
      trial: 'secondary',
      suspended: 'destructive',
      cancelled: 'destructive',
      archived: 'outline',
      pending_approval: 'secondary'
    };
    return variantMap[status] || 'outline';
  }
};
