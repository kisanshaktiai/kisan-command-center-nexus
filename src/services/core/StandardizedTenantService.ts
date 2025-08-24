
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
      () => this.repository.getTenants(filters),
      'getAllTenants'
    );
  }

  async getTenantById(id: string): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      () => this.repository.getTenant(id),
      'getTenantById'
    );
  }

  async createTenant(data: CreateTenantDTO): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      () => this.repository.createTenant(data),
      'createTenant'
    );
  }

  async updateTenant(id: string, data: UpdateTenantDTO): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      () => this.repository.updateTenant(id, data),
      'updateTenant'
    );
  }

  async suspendTenant(id: string, reason?: string): Promise<ServiceResult<boolean>> {
    return this.executeOperation(
      async () => {
        // Implementation would call repository method for suspension
        // For now, we'll use a placeholder
        return { success: true, data: true };
      },
      'suspendTenant'
    );
  }

  async reactivateTenant(id: string): Promise<ServiceResult<boolean>> {
    return this.executeOperation(
      async () => {
        // Implementation would call repository method for reactivation
        // For now, we'll use a placeholder
        return { success: true, data: true };
      },
      'reactivateTenant'
    );
  }
}

export const standardizedTenantService = StandardizedTenantService.getInstance();
