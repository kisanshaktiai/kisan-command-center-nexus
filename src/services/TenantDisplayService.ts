
import { Tenant } from '@/types/tenant';
import { formatters } from '@/shared/utils/formatters';
import { mapTenantTypeToDisplay, mapTenantStatusToDisplay, mapSubscriptionPlanToDisplay } from '@/shared/utils/mappers';

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
    // Add safety checks and default values
    const safeTenant = {
      id: tenant?.id || '',
      name: tenant?.name || 'Unknown',
      slug: tenant?.slug || '',
      type: tenant?.type,
      status: tenant?.status,
      subscription_plan: tenant?.subscription_plan,
      owner_email: tenant?.owner_email,
      owner_name: tenant?.owner_name,
      owner_phone: tenant?.owner_phone,
      created_at: tenant?.created_at,
      updated_at: tenant?.updated_at,
      business_address: tenant?.business_address,
      max_farmers: tenant?.max_farmers,
      max_dealers: tenant?.max_dealers,
      max_storage_gb: tenant?.max_storage_gb,
      max_api_calls_per_day: tenant?.max_api_calls_per_day,
      subdomain: tenant?.subdomain,
      custom_domain: tenant?.custom_domain
    };

    return {
      id: safeTenant.id,
      name: safeTenant.name,
      slug: safeTenant.slug,
      displayType: mapTenantTypeToDisplay(safeTenant.type),
      displayStatus: mapTenantStatusToDisplay(safeTenant.status),
      statusBadgeVariant: this.getStatusBadgeVariant(safeTenant.status),
      planBadgeVariant: this.getPlanBadgeVariant(safeTenant.subscription_plan),
      planDisplayName: mapSubscriptionPlanToDisplay(safeTenant.subscription_plan),
      ownerEmail: safeTenant.owner_email || 'Not provided',
      ownerName: safeTenant.owner_name || 'Not provided',
      ownerPhone: safeTenant.owner_phone || 'Not provided',
      formattedCreatedAt: formatters.dateTime(safeTenant.created_at),
      formattedUpdatedAt: formatters.dateTime(safeTenant.updated_at),
      formattedBusinessAddress: this.formatBusinessAddress(safeTenant.business_address),
      limitsDisplay: {
        farmers: safeTenant.max_farmers?.toLocaleString() || 'Unlimited',
        dealers: safeTenant.max_dealers?.toLocaleString() || 'Unlimited',
        storage: safeTenant.max_storage_gb ? `${safeTenant.max_storage_gb} GB` : 'Unlimited',
        apiCalls: safeTenant.max_api_calls_per_day?.toLocaleString() || 'Unlimited'
      },
      domainInfo: {
        subdomain: safeTenant.subdomain,
        customDomain: safeTenant.custom_domain
      }
    };
  }

  static formatTenantsForDisplay(tenants: Tenant[]): FormattedTenantData[] {
    return tenants.map(tenant => this.formatTenantForDisplay(tenant));
  }

  private static getStatusBadgeVariant(status?: string): string {
    if (!status) return 'secondary';
    
    switch (String(status).toLowerCase()) {
      case 'active': return 'default';
      case 'trial': return 'secondary';
      case 'suspended': return 'destructive';
      case 'cancelled': return 'outline';
      default: return 'secondary';
    }
  }

  private static getPlanBadgeVariant(plan?: string): string {
    if (!plan) return 'outline';
    
    switch (String(plan)) {
      case 'AI_Enterprise': return 'default';
      case 'Shakti_Growth': return 'secondary';
      case 'Kisan_Basic': return 'outline';
      default: return 'outline';
    }
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

  static getStatusColor(status?: string): string {
    if (!status) return 'bg-gray-500';
    
    switch (String(status).toLowerCase()) {
      case 'active': return 'bg-green-500';
      case 'trial': return 'bg-blue-500';
      case 'suspended': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  }
}
