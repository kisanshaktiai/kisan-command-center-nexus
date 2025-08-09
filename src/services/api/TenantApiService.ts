
import { enhancedApiFactory } from './EnhancedApiFactory';
import { CreateTenantDTO, UpdateTenantDTO, TenantFilters, Tenant, convertDatabaseTenant } from '@/types/tenant';
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

  // Helper functions to validate and convert enums
  private validateTenantType(type: string | TenantType): TenantType {
    if (typeof type === 'string') {
      if (Object.values(TenantType).includes(type as TenantType)) {
        return type as TenantType;
      }
      throw new Error(`Invalid tenant type: ${type}`);
    }
    return type;
  }

  private validateTenantStatus(status: string | TenantStatus): TenantStatus {
    if (typeof status === 'string') {
      if (Object.values(TenantStatus).includes(status as TenantStatus)) {
        return status as TenantStatus;
      }
      throw new Error(`Invalid tenant status: ${status}`);
    }
    return status;
  }

  private validateSubscriptionPlan(plan: string | SubscriptionPlan): SubscriptionPlan {
    if (typeof plan === 'string') {
      if (Object.values(SubscriptionPlan).includes(plan as SubscriptionPlan)) {
        return plan as SubscriptionPlan;
      }
      throw new Error(`Invalid subscription plan: ${plan}`);
    }
    return plan;
  }

  async getTenants(filters?: TenantFilters) {
    const response = await enhancedApiFactory.get<any[]>('tenants', filters);
    if (response.success && response.data) {
      // Convert raw database results to properly typed Tenant objects
      const convertedTenants = response.data.map(convertDatabaseTenant);
      return { ...response, data: convertedTenants };
    }
    return response;
  }

  async getTenantById(id: string) {
    const response = await enhancedApiFactory.get<any>('tenants', { id });
    if (response.success && response.data) {
      // Convert raw database result to properly typed Tenant object
      const convertedTenant = convertDatabaseTenant(response.data);
      return { ...response, data: convertedTenant };
    }
    return response;
  }

  async createTenant(data: CreateTenantDTO) {
    // Validate and convert enums before sending
    const validatedData: CreateTenantDTO = {
      ...data,
      type: this.validateTenantType(data.type),
      status: this.validateTenantStatus(data.status),
      subscription_plan: this.validateSubscriptionPlan(data.subscription_plan)
    };

    const response = await enhancedApiFactory.post<any>('tenants', validatedData);
    if (response.success && response.data) {
      // Convert raw database result to properly typed Tenant object
      const convertedTenant = convertDatabaseTenant(response.data);
      return { ...response, data: convertedTenant };
    }
    return response;
  }

  async updateTenant(id: string, data: UpdateTenantDTO) {
    // Validate and convert enums if provided
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

    const response = await enhancedApiFactory.put<any>('tenants', id, validatedData);
    if (response.success && response.data) {
      // Convert raw database result to properly typed Tenant object
      const convertedTenant = convertDatabaseTenant(response.data);
      return { ...response, data: convertedTenant };
    }
    return response;
  }

  async deleteTenant(id: string) {
    return enhancedApiFactory.delete('tenants', id);
  }

  async getTenantsByType(type: TenantType | string) {
    const validatedType = this.validateTenantType(type);
    const response = await enhancedApiFactory.get<any[]>('tenants', { type: validatedType });
    if (response.success && response.data) {
      const convertedTenants = response.data.map(convertDatabaseTenant);
      return { ...response, data: convertedTenants };
    }
    return response;
  }

  async getTenantsByStatus(status: TenantStatus | string) {
    const validatedStatus = this.validateTenantStatus(status);
    const response = await enhancedApiFactory.get<any[]>('tenants', { status: validatedStatus });
    if (response.success && response.data) {
      const convertedTenants = response.data.map(convertDatabaseTenant);
      return { ...response, data: convertedTenants };
    }
    return response;
  }

  async updateTenantStatus(id: string, status: TenantStatus | string) {
    const validatedStatus = this.validateTenantStatus(status);
    const response = await enhancedApiFactory.patch<any>('tenants', id, { status: validatedStatus });
    if (response.success && response.data) {
      const convertedTenant = convertDatabaseTenant(response.data);
      return { ...response, data: convertedTenant };
    }
    return response;
  }
}

export const tenantApiService = TenantApiService.getInstance();
