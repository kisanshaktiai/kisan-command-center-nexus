
import { BaseService, ServiceResult } from '@/services/BaseService';
import { tenantRepository } from '@/data/repositories/TenantRepository';
import { CreateTenantDTO, UpdateTenantDTO, TenantDTO } from '@/data/types/tenant';
import { unifiedErrorService } from '@/services/core/UnifiedErrorService';

export class TenantManagementService extends BaseService {
  private static instance: TenantManagementService;

  private constructor() {
    super();
  }

  public static getInstance(): TenantManagementService {
    if (!TenantManagementService.instance) {
      TenantManagementService.instance = new TenantManagementService();
    }
    return TenantManagementService.instance;
  }

  async getAllTenants(filters?: any): Promise<ServiceResult<TenantDTO[]>> {
    return this.executeOperation(
      async () => {
        const data = await tenantRepository.getTenants(filters);
        // Map the data to ensure type compatibility
        return data.map((tenant: any): TenantDTO => ({
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          type: tenant.type,
          status: tenant.status,
          subscription_plan: tenant.subscription_plan,
          created_at: tenant.created_at,
          updated_at: tenant.updated_at,
          owner_email: tenant.owner_email,
          owner_name: tenant.owner_name,
          owner_phone: tenant.owner_phone,
          business_registration: tenant.business_registration,
          business_address: tenant.business_address,
          established_date: tenant.established_date,
          subscription_start_date: tenant.subscription_start_date,
          subscription_end_date: tenant.subscription_end_date,
          trial_ends_at: tenant.trial_ends_at,
          max_farmers: tenant.max_farmers,
          max_dealers: tenant.max_dealers,
          max_products: tenant.max_products,
          max_storage_gb: tenant.max_storage_gb,
          max_api_calls_per_day: tenant.max_api_calls_per_day,
          subdomain: tenant.subdomain,
          custom_domain: tenant.custom_domain,
          metadata: tenant.metadata,
        }));
      },
      'getAllTenants'
    );
  }

  async getTenantById(id: string): Promise<ServiceResult<TenantDTO>> {
    return this.executeOperation(
      async () => {
        const tenant = await tenantRepository.getTenant(id);
        // Map the data to ensure type compatibility
        return {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          type: tenant.type,
          status: tenant.status,
          subscription_plan: tenant.subscription_plan,
          created_at: tenant.created_at,
          updated_at: tenant.updated_at,
          owner_email: tenant.owner_email,
          owner_name: tenant.owner_name,
          owner_phone: tenant.owner_phone,
          business_registration: tenant.business_registration,
          business_address: tenant.business_address,
          established_date: tenant.established_date,
          subscription_start_date: tenant.subscription_start_date,
          subscription_end_date: tenant.subscription_end_date,
          trial_ends_at: tenant.trial_ends_at,
          max_farmers: tenant.max_farmers,
          max_dealers: tenant.max_dealers,
          max_products: tenant.max_products,
          max_storage_gb: tenant.max_storage_gb,
          max_api_calls_per_day: tenant.max_api_calls_per_day,
          subdomain: tenant.subdomain,
          custom_domain: tenant.custom_domain,
          metadata: tenant.metadata,
        } as TenantDTO;
      },
      'getTenantById'
    );
  }

  async createTenant(data: CreateTenantDTO): Promise<ServiceResult<TenantDTO>> {
    return this.executeOperation(
      async () => {
        const tenant = await tenantRepository.createTenant(data);
        return {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          type: tenant.type,
          status: tenant.status,
          subscription_plan: tenant.subscription_plan,
          created_at: tenant.created_at,
          updated_at: tenant.updated_at,
          owner_email: tenant.owner_email,
          owner_name: tenant.owner_name,
          owner_phone: tenant.owner_phone,
          business_registration: tenant.business_registration,
          business_address: tenant.business_address,
          established_date: tenant.established_date,
          subscription_start_date: tenant.subscription_start_date,
          subscription_end_date: tenant.subscription_end_date,
          trial_ends_at: tenant.trial_ends_at,
          max_farmers: tenant.max_farmers,
          max_dealers: tenant.max_dealers,
          max_products: tenant.max_products,
          max_storage_gb: tenant.max_storage_gb,
          max_api_calls_per_day: tenant.max_api_calls_per_day,
          subdomain: tenant.subdomain,
          custom_domain: tenant.custom_domain,
          metadata: tenant.metadata,
        } as TenantDTO;
      },
      'createTenant'
    );
  }

  async updateTenant(id: string, data: UpdateTenantDTO): Promise<ServiceResult<TenantDTO>> {
    return this.executeOperation(
      async () => {
        const tenant = await tenantRepository.updateTenant(id, data);
        return {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          type: tenant.type,
          status: tenant.status,
          subscription_plan: tenant.subscription_plan,
          created_at: tenant.created_at,
          updated_at: tenant.updated_at,
          owner_email: tenant.owner_email,
          owner_name: tenant.owner_name,
          owner_phone: tenant.owner_phone,
          business_registration: tenant.business_registration,
          business_address: tenant.business_address,
          established_date: tenant.established_date,
          subscription_start_date: tenant.subscription_start_date,
          subscription_end_date: tenant.subscription_end_date,
          trial_ends_at: tenant.trial_ends_at,
          max_farmers: tenant.max_farmers,
          max_dealers: tenant.max_dealers,
          max_products: tenant.max_products,
          max_storage_gb: tenant.max_storage_gb,
          max_api_calls_per_day: tenant.max_api_calls_per_day,
          subdomain: tenant.subdomain,
          custom_domain: tenant.custom_domain,
          metadata: tenant.metadata,
        } as TenantDTO;
      },
      'updateTenant'
    );
  }

  async deleteTenant(id: string): Promise<ServiceResult<boolean>> {
    return this.executeOperation(
      () => tenantRepository.deleteTenant(id),
      'deleteTenant'
    );
  }

  async validateTenantData(data: Partial<CreateTenantDTO>): Promise<ServiceResult<boolean>> {
    return this.executeOperation(
      async () => {
        // Add validation logic here
        if (!data.name?.trim()) {
          throw new Error('Tenant name is required');
        }
        if (!data.slug?.trim()) {
          throw new Error('Tenant slug is required');
        }
        return true;
      },
      'validateTenantData'
    );
  }
}

export const tenantManagementService = TenantManagementService.getInstance();
