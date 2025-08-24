
import { BaseService, ServiceResult } from '@/services/BaseService';
import { CreateTenantDTO, UpdateTenantDTO, TenantFilters, Tenant } from '@/types/tenant';
import { tenantRepository } from '@/data/repositories/TenantRepository';

/**
 * Standardized Tenant Service
 * Follows consistent naming and provides mock-friendly interface for testing
 */
export class StandardizedTenantService extends BaseService {
  private static instance: StandardizedTenantService;

  private constructor(
    private repository = tenantRepository
  ) {
    super();
  }

  public static getInstance(): StandardizedTenantService {
    if (!StandardizedTenantService.instance) {
      StandardizedTenantService.instance = new StandardizedTenantService();
    }
    return StandardizedTenantService.instance;
  }

  // Factory method for testing - allows dependency injection
  public static createTestInstance(mockRepository: any): StandardizedTenantService {
    return new StandardizedTenantService(mockRepository);
  }

  async getAllTenants(filters?: TenantFilters): Promise<ServiceResult<Tenant[]>> {
    return this.executeOperation(
      async () => {
        const result = await this.repository.getTenants(filters);
        return result;
      },
      'getAllTenants'
    );
  }

  async getTenantById(id: string): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      async () => {
        const result = await this.repository.getTenant(id);
        return result;
      },
      'getTenantById'
    );
  }

  async createTenant(data: CreateTenantDTO): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      async () => {
        const result = await this.repository.createTenant(data);
        return result;
      },
      'createTenant'
    );
  }

  async updateTenant(id: string, data: UpdateTenantDTO): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      async () => {
        const result = await this.repository.updateTenant(id, data);
        return result;
      },
      'updateTenant'
    );
  }

  async suspendTenant(id: string, reason?: string): Promise<ServiceResult<boolean>> {
    return this.executeOperation(
      async () => {
        // Implementation would call repository method for suspension
        // For now, we'll use a placeholder
        return true;
      },
      'suspendTenant'
    );
  }

  async reactivateTenant(id: string): Promise<ServiceResult<boolean>> {
    return this.executeOperation(
      async () => {
        // Implementation would call repository method for reactivation
        // For now, we'll use a placeholder
        return true;
      },
      'reactivateTenant'
    );
  }
}

export const standardizedTenantService = StandardizedTenantService.getInstance();
