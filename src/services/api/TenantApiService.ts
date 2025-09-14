
import { enhancedApiFactory } from './EnhancedApiFactory';
import { 
  CreateTenantDTO, 
  UpdateTenantDTO, 
  TenantFilters, 
  Tenant, 
  convertDatabaseTenant,
  convertEnumToString,
  TenantTypeValue,
  TenantStatusValue,
  SubscriptionPlanValue
} from '@/types/tenant';
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

  // Helper functions to convert UI enums to database string literals
  private convertTenantType(type: string | TenantType): TenantTypeValue {
    if (typeof type === 'string') {
      // If it's already a valid database value, return as is
      if (['agri_company', 'dealer', 'ngo', 'government', 'university', 'sugar_factory', 'cooperative', 'insurance'].includes(type)) {
        return type as TenantTypeValue;
      }
      // If it's an enum value, convert it
      return convertEnumToString.type(type as TenantType);
    }
    return convertEnumToString.type(type);
  }

  private convertTenantStatus(status: string | TenantStatus): TenantStatusValue {
    if (typeof status === 'string') {
      // If it's already a valid database value, return as is
      if (['active', 'trial', 'suspended', 'cancelled', 'archived', 'pending_approval'].includes(status)) {
        return status as TenantStatusValue;
      }
      // If it's an enum value, convert it
      return convertEnumToString.status(status as TenantStatus);
    }
    return convertEnumToString.status(status);
  }

  private convertSubscriptionPlan(plan: string | SubscriptionPlan): SubscriptionPlanValue {
    if (typeof plan === 'string') {
      // If it's already a valid database value, return as is
      if (['Kisan_Basic', 'Shakti_Growth', 'AI_Enterprise', 'custom'].includes(plan)) {
        return plan as SubscriptionPlanValue;
      }
      // If it's an enum value, convert it
      return convertEnumToString.subscriptionPlan(plan as SubscriptionPlan);
    }
    return convertEnumToString.subscriptionPlan(plan);
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
    // Convert enums to database string literals
    const validatedData: CreateTenantDTO = {
      ...data,
      type: this.convertTenantType(data.type),
      status: this.convertTenantStatus(data.status),
      subscription_plan: this.convertSubscriptionPlan(data.subscription_plan)
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
    // Convert enums to database string literals if provided
    const validatedData: UpdateTenantDTO = { ...data };
    
    if (data.type) {
      validatedData.type = this.convertTenantType(data.type);
    }
    
    if (data.status) {
      validatedData.status = this.convertTenantStatus(data.status);
    }
    
    if (data.subscription_plan) {
      validatedData.subscription_plan = this.convertSubscriptionPlan(data.subscription_plan);
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
    const validatedType = this.convertTenantType(type);
    const response = await enhancedApiFactory.get<any[]>('tenants', { type: validatedType });
    if (response.success && response.data) {
      const convertedTenants = response.data.map(convertDatabaseTenant);
      return { ...response, data: convertedTenants };
    }
    return response;
  }

  async getTenantsByStatus(status: TenantStatus | string) {
    const validatedStatus = this.convertTenantStatus(status);
    const response = await enhancedApiFactory.get<any[]>('tenants', { status: validatedStatus });
    if (response.success && response.data) {
      const convertedTenants = response.data.map(convertDatabaseTenant);
      return { ...response, data: convertedTenants };
    }
    return response;
  }

  async updateTenantStatus(id: string, status: TenantStatus | string) {
    const validatedStatus = this.convertTenantStatus(status);
    const response = await enhancedApiFactory.patch<any>('tenants', id, { status: validatedStatus });
    if (response.success && response.data) {
      const convertedTenant = convertDatabaseTenant(response.data);
      return { ...response, data: convertedTenant };
    }
    return response;
  }
}

export const tenantApiService = TenantApiService.getInstance();
