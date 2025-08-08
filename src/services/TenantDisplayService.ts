
import { Tenant } from '@/types/tenant';
import { formatters } from '@/shared/utils/formatters';
import { tenantMappers } from '@/shared/utils/mappers';

export interface FormattedTenantData {
  id: string;
  name: string;
  slug: string;
  displayType: string;
  displayStatus: string;
  statusBadgeVariant: string;
  planBadgeVariant: string;
  planDisplayName: string;
  ownerEmail: string;
  ownerName: string;
  ownerPhone: string;
  formattedCreatedAt: string;
  formattedUpdatedAt: string;
  formattedBusinessAddress: string;
  limitsDisplay: {
    farmers: string;
    dealers: string;
    storage: string;
    apiCalls: string;
  };
  domainInfo: {
    subdomain?: string;
    customDomain?: string;
  };
}

export class TenantDisplayService {
  static formatTenantForDisplay(tenant: Tenant): FormattedTenantData {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      displayType: tenantMappers.typeToLabel(tenant.type as any),
      displayStatus: tenantMappers.statusToLabel(tenant.status as any),
      statusBadgeVariant: tenantMappers.statusToBadgeVariant(tenant.status as any),
      planBadgeVariant: this.getPlanBadgeVariant(tenant.subscription_plan),
      planDisplayName: this.getPlanDisplayName(tenant.subscription_plan),
      ownerEmail: tenant.owner_email || 'Not provided',
      ownerName: tenant.owner_name || 'Not provided',
      ownerPhone: tenant.owner_phone || 'Not provided',
      formattedCreatedAt: formatters.dateTime(tenant.created_at),
      formattedUpdatedAt: formatters.dateTime(tenant.updated_at),
      formattedBusinessAddress: this.formatBusinessAddress(tenant.business_address),
      limitsDisplay: {
        farmers: tenant.max_farmers?.toLocaleString() || 'Unlimited',
        dealers: tenant.max_dealers?.toLocaleString() || 'Unlimited',
        storage: tenant.max_storage_gb ? `${tenant.max_storage_gb} GB` : 'Unlimited',
        apiCalls: tenant.max_api_calls_per_day?.toLocaleString() || 'Unlimited'
      },
      domainInfo: {
        subdomain: tenant.subdomain,
        customDomain: tenant.custom_domain
      }
    };
  }

  static formatTenantsForDisplay(tenants: Tenant[]): FormattedTenantData[] {
    return tenants.map(tenant => this.formatTenantForDisplay(tenant));
  }

  private static getPlanBadgeVariant(plan: string) {
    switch (plan) {
      case 'AI_Enterprise': return 'default';
      case 'Shakti_Growth': return 'secondary';
      case 'Kisan_Basic': return 'outline';
      default: return 'outline';
    }
  }

  private static getPlanDisplayName(plan: string): string {
    return plan.replace('_', ' ');
  }

  private static formatBusinessAddress(address: any): string {
    if (!address || typeof address !== 'object') return 'Not provided';
    
    const parts = [
      address.street,
      address.city,
      address.state,
      address.postal_code,
      address.country
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : 'Not provided';
  }

  static getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-500';
      case 'trial': return 'bg-blue-500';
      case 'suspended': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  }
}
