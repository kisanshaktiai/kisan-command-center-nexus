
import { BaseService, ServiceResult } from '@/services/BaseService';
import { tenantApiService, TenantFilters } from '@/services/api/TenantApiService';
import { CreateTenantDTO, UpdateTenantDTO, TenantDTO } from '@/data/types/tenant';

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

  async getAllTenants(filters?: TenantFilters): Promise<ServiceResult<TenantDTO[]>> {
    return tenantApiService.getTenants(filters);
  }

  async getTenantById(id: string): Promise<ServiceResult<TenantDTO>> {
    return tenantApiService.getTenantById(id);
  }

  async createTenant(data: CreateTenantDTO): Promise<ServiceResult<TenantDTO>> {
    // Validate tenant data before creation
    const validationResult = await this.validateTenantData(data);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error,
        data: null
      } as ServiceResult<TenantDTO>;
    }

    return tenantApiService.createTenant(data);
  }

  async updateTenant(id: string, data: UpdateTenantDTO): Promise<ServiceResult<TenantDTO>> {
    return tenantApiService.updateTenant(id, data);
  }

  async deleteTenant(id: string): Promise<ServiceResult<boolean>> {
    return tenantApiService.deleteTenant(id);
  }

  async validateTenantData(data: Partial<CreateTenantDTO>): Promise<ServiceResult<boolean>> {
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

export const tenantManagementService = TenantManagementService.getInstance();
