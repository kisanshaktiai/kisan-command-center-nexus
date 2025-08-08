
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
      () => tenantRepository.getTenants(filters),
      'getAllTenants'
    );
  }

  async getTenantById(id: string): Promise<ServiceResult<TenantDTO>> {
    return this.executeOperation(
      () => tenantRepository.getTenant(id),
      'getTenantById'
    );
  }

  async createTenant(data: CreateTenantDTO): Promise<ServiceResult<TenantDTO>> {
    return this.executeOperation(
      () => tenantRepository.createTenant(data),
      'createTenant'
    );
  }

  async updateTenant(id: string, data: UpdateTenantDTO): Promise<ServiceResult<TenantDTO>> {
    return this.executeOperation(
      () => tenantRepository.updateTenant(id, data),
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
