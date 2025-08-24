
import { BaseService, ServiceResult } from '@/services/BaseService';
import { tenantRepository } from '@/data/repositories/TenantRepository';
import { CreateTenantDTO, UpdateTenantDTO, Tenant, TenantFilters, convertDatabaseTenant } from '@/types/tenant';

export class TenantDomainService extends BaseService {
  private static instance: TenantDomainService;

  private constructor() {
    super();
  }

  public static getInstance(): TenantDomainService {
    if (!TenantDomainService.instance) {
      TenantDomainService.instance = new TenantDomainService();
    }
    return TenantDomainService.instance;
  }

  async getAllTenants(filters?: TenantFilters): Promise<ServiceResult<Tenant[]>> {
    return this.executeOperation(
      async () => {
        const result = await tenantRepository.getTenants(filters);
        if (!result.success) {
          throw new Error(result.error);
        }
        return (result.data || []).map(convertDatabaseTenant);
      },
      'getAllTenants'
    );
  }

  async getTenantById(id: string): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      async () => {
        const result = await tenantRepository.getTenant(id);
        if (!result.success) {
          throw new Error(result.error);
        }
        return convertDatabaseTenant(result.data);
      },
      'getTenantById'
    );
  }

  async createTenant(data: CreateTenantDTO): Promise<ServiceResult<Tenant>> {
    // Validate tenant data before creation
    const validationResult = await this.validateTenantData(data);
    if (!validationResult.success) {
      return validationResult as ServiceResult<Tenant>;
    }

    return this.executeOperation(
      async () => {
        const result = await tenantRepository.createTenant(data);
        if (!result.success) {
          throw new Error(result.error);
        }
        return convertDatabaseTenant(result.data);
      },
      'createTenant'
    );
  }

  async updateTenant(id: string, data: UpdateTenantDTO): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      async () => {
        const result = await tenantRepository.updateTenant(id, data);
        if (!result.success) {
          throw new Error(result.error);
        }
        return convertDatabaseTenant(result.data);
      },
      'updateTenant'
    );
  }

  async deleteTenant(id: string): Promise<ServiceResult<boolean>> {
    return this.executeOperation(
      async () => {
        const result = await tenantRepository.deleteTenant(id);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.data!;
      },
      'deleteTenant'
    );
  }

  private async validateTenantData(data: Partial<CreateTenantDTO>): Promise<ServiceResult<boolean>> {
    return this.executeOperation(
      async () => {
        const errors: string[] = [];

        if (!data.name?.trim()) {
          errors.push('Tenant name is required');
        }

        if (!data.slug?.trim()) {
          errors.push('Tenant slug is required');
        }

        if (!data.owner_email?.trim()) {
          errors.push('Owner email is required');
        }

        if (!data.owner_name?.trim()) {
          errors.push('Owner name is required');
        }

        // Validate email format
        if (data.owner_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.owner_email)) {
          errors.push('Invalid email format');
        }

        if (errors.length > 0) {
          throw new Error(errors.join(', '));
        }

        return true;
      },
      'validateTenantData'
    );
  }
}

export const tenantDomainService = TenantDomainService.getInstance();
