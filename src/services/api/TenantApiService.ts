import { enhancedApiFactory } from './EnhancedApiFactory';
import { CreateTenantDTO, UpdateTenantDTO, TenantFilters, Tenant } from '@/types/tenant';
import { TenantType, TenantStatus, SubscriptionPlan } from '@/types/enums';

// Re-export TenantFilters for external use
export type { TenantFilters };

export class TenantApiService {
  private static instance: TenantApiService;

  public static getInstance(): TenantApiService {
    if (!TenantApiService.instance) {
      TenantApiService.instance = new TenantApiService();
    }
    return TenantApiService.instance;
  }

  // Helper functions to validate enums
  private validateTenantType(type: string): TenantType {
    if (Object.values(TenantType).includes(type as TenantType)) {
      return type as TenantType;
    }
    throw new Error(`Invalid tenant type: ${type}`);
  }

  private validateTenantStatus(status: string): TenantStatus {
    if (Object.values(TenantStatus).includes(status as TenantStatus)) {
      return status as TenantStatus;
    }
    throw new Error(`Invalid tenant status: ${status}`);
  }

  private validateSubscriptionPlan(plan: string): SubscriptionPlan {
    if (Object.values(SubscriptionPlan).includes(plan as SubscriptionPlan)) {
      return plan as SubscriptionPlan;
    }
    throw new Error(`Invalid subscription plan: ${plan}`);
  }

  async getTenants(filters?: TenantFilters) {
    return enhancedApiFactory.get<Tenant[]>('tenants', filters);
  }

  async getTenantById(id: string) {
    return enhancedApiFactory.get<Tenant>('tenants', { id });
  }

  async createTenant(data: CreateTenantDTO) {
    // Validate enums before sending
    const validatedData: CreateTenantDTO = {
      ...data,
      type: this.validateTenantType(data.type),
      status: this.validateTenantStatus(data.status),
      subscription_plan: this.validateSubscriptionPlan(data.subscription_plan)
    };

    return enhancedApiFactory.post<Tenant>('tenants', validatedData);
  }

  async updateTenant(id: string, data: UpdateTenantDTO) {
    // Validate enums if provided
    const validatedData: UpdateTenantDTO = { ...data };
    
    if (data.type) {
      validatedData.type = this.validateTenantType(data.type);
    }
    
    if (data.status) {
      validatedData.status = this.validateTenantStatus(data.status);
    }
    
    if (data.subscription_plan) {
      validatedData.subscription_plan = this.validateSubscriptionPlan(data.subscription_plan);
    }

    return enhancedApiFactory.put<Tenant>('tenants', id, validatedData);
  }

  async deleteTenant(id: string) {
    return enhancedApiFactory.delete('tenants', id);
  }

  async getTenantsByType(type: TenantType) {
    return enhancedApiFactory.get<Tenant[]>('tenants', { type });
  }

  async getTenantsByStatus(status: TenantStatus) {
    return enhancedApiFactory.get<Tenant[]>('tenants', { status });
  }

  async updateTenantStatus(id: string, status: TenantStatus) {
    const validatedStatus = this.validateTenantStatus(status);
    return enhancedApiFactory.patch<Tenant>('tenants', id, { status: validatedStatus });
  }
}

export const tenantApiService = TenantApiService.getInstance();
