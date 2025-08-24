
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
        const rawData = await tenantRepository.getTenants(filters);
        return rawData.map(convertDatabaseTenant);
      },
      'getTenants'
    );
  }

  async getTenant(id: string): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      async () => {
        const rawData = await tenantRepository.getTenant(id);
        return convertDatabaseTenant(rawData);
      },
      'getTenant'
    );
  }

  async createTenant(data: CreateTenantDTO): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      async () => {
        const rawData = await tenantRepository.createTenant(data);
        return convertDatabaseTenant(rawData);
      },
      'createTenant'
    );
  }

  async updateTenant(id: string, data: UpdateTenantDTO): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      async () => {
        const rawData = await tenantRepository.updateTenant(id, data);
        return convertDatabaseTenant(rawData);
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
}

export const tenantService = TenantService.getInstance();
