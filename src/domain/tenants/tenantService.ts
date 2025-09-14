
import { tenantRepository } from '@/data/repositories/TenantRepository';
import { BaseService, ServiceResult } from '@/services/BaseService';
import { CreateTenantDTO, UpdateTenantDTO, Tenant, TenantFilters, convertDatabaseTenant } from '@/types/tenant';

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
        const result = await tenantRepository.getTenants(filters);
        if (!result.success) {
          throw new Error(result.error);
        }
        return (result.data || []).map(convertDatabaseTenant);
      },
      'getTenants'
    );
  }

  async getTenant(id: string): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      async () => {
        const result = await tenantRepository.getTenant(id);
        if (!result.success) {
          throw new Error(result.error);
        }
        return convertDatabaseTenant(result.data);
      },
      'getTenant'
    );
  }

  async createTenant(data: CreateTenantDTO): Promise<ServiceResult<Tenant>> {
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
}

export const tenantService = TenantService.getInstance();
