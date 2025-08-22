
import { BaseService, ServiceResult } from './BaseService';
import { tenantRepository } from '@/data/repositories/TenantRepository';
import { CreateTenantDTO, UpdateTenantDTO, Tenant, TenantFilters } from '@/types/tenant';

export class TenantService extends BaseService {
  private static instance: TenantService;

  private constructor() {
    super();
  }

  public static getInstance(): TenantService {
    if (!TenantService.instance) {
      TenantService.instance = new TenantService();
    }
    return TenantService.instance;
  }

  async getTenants(filters?: TenantFilters): Promise<ServiceResult<Tenant[]>> {
    return this.executeOperation(
      async () => {
        const rawData = await tenantRepository.getTenants(filters);
        return rawData.map(tenant => this.transformDatabaseTenant(tenant));
      },
      'getTenants'
    );
  }

  async getTenant(id: string): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      async () => {
        const rawData = await tenantRepository.getTenant(id);
        return this.transformDatabaseTenant(rawData);
      },
      'getTenant'
    );
  }

  async createTenant(data: CreateTenantDTO): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      async () => {
        const rawData = await tenantRepository.createTenant(data);
        return this.transformDatabaseTenant(rawData);
      },
      'createTenant'
    );
  }

  async updateTenant(id: string, data: UpdateTenantDTO): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      async () => {
        const rawData = await tenantRepository.updateTenant(id, data);
        return this.transformDatabaseTenant(rawData);
      },
      'updateTenant'
    );
  }

  async deleteTenant(id: string): Promise<ServiceResult<boolean>> {
    return this.executeOperation(
      async () => tenantRepository.deleteTenant(id),
      'deleteTenant'
    );
  }

  async suspendTenant(id: string, reason?: string): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      async () => {
        const updateData: UpdateTenantDTO = {
          status: 'suspended',
          suspended_at: new Date().toISOString(),
          metadata: { suspension_reason: reason }
        };
        const rawData = await tenantRepository.updateTenant(id, updateData);
        return this.transformDatabaseTenant(rawData);
      },
      'suspendTenant'
    );
  }

  async reactivateTenant(id: string): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      async () => {
        const updateData: UpdateTenantDTO = {
          status: 'active',
          reactivated_at: new Date().toISOString(),
          suspended_at: undefined
        };
        const rawData = await tenantRepository.updateTenant(id, updateData);
        return this.transformDatabaseTenant(rawData);
      },
      'reactivateTenant'
    );
  }

  private transformDatabaseTenant(rawTenant: any): Tenant {
    return {
      id: rawTenant.id,
      name: rawTenant.name,
      slug: rawTenant.slug,
      type: rawTenant.type,
      status: rawTenant.status,
      subscription_plan: rawTenant.subscription_plan,
      owner_name: rawTenant.owner_name,
      owner_email: rawTenant.owner_email,
      owner_phone: rawTenant.owner_phone,
      business_registration: rawTenant.business_registration,
      business_address: rawTenant.business_address,
      established_date: rawTenant.established_date,
      subscription_start_date: rawTenant.subscription_start_date,
      subscription_end_date: rawTenant.subscription_end_date,
      trial_ends_at: rawTenant.trial_ends_at,
      suspended_at: rawTenant.suspended_at,
      reactivated_at: rawTenant.reactivated_at,
      archived_at: rawTenant.archived_at,
      max_farmers: rawTenant.max_farmers,
      max_dealers: rawTenant.max_dealers,
      max_products: rawTenant.max_products,
      max_storage_gb: rawTenant.max_storage_gb,
      max_api_calls_per_day: rawTenant.max_api_calls_per_day,
      subdomain: rawTenant.subdomain,
      custom_domain: rawTenant.custom_domain,
      metadata: rawTenant.metadata || {},
      created_at: rawTenant.created_at,
      updated_at: rawTenant.updated_at
    };
  }
}

export const tenantService = TenantService.getInstance();
