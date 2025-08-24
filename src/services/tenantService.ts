
import { ApiResponse, ApiFactory } from '@/services/ApiFactory';
import { 
  Tenant, 
  CreateTenantDTO, 
  UpdateTenantDTO, 
  TenantFilters,
  TenantID,
  createTenantID,
  convertDatabaseTenant
} from '@/types/tenant';
import { TenantStatus, TenantType, SubscriptionPlan } from '@/types/enums';

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class TenantService {
  async getTenants(filters?: TenantFilters): Promise<ServiceResult<Tenant[]>> {
    try {
      const response = await ApiFactory.get<any[]>('tenants', filters);
      
      if (response.success && response.data) {
        const convertedTenants = response.data.map(convertDatabaseTenant);
        return {
          success: true,
          data: convertedTenants
        };
      }
      
      return {
        success: false,
        error: response.error || 'Failed to fetch tenants'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch tenants'
      };
    }
  }

  async createTenant(data: CreateTenantDTO): Promise<ServiceResult<Tenant>> {
    try {
      const response = await ApiFactory.post<any>('tenants', data);
      
      if (response.success && response.data) {
        const convertedTenant = convertDatabaseTenant(response.data);
        return {
          success: true,
          data: convertedTenant
        };
      }
      
      return {
        success: false,
        error: response.error || 'Failed to create tenant'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create tenant'
      };
    }
  }

  async updateTenant(id: string, data: UpdateTenantDTO): Promise<ServiceResult<Tenant>> {
    try {
      const response = await ApiFactory.put<any>('tenants', id, data);
      
      if (response.success && response.data) {
        const convertedTenant = convertDatabaseTenant(response.data);
        return {
          success: true,
          data: convertedTenant
        };
      }
      
      return {
        success: false,
        error: response.error || 'Failed to update tenant'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update tenant'
      };
    }
  }

  async deleteTenant(id: string): Promise<ServiceResult<void>> {
    try {
      const response = await ApiFactory.delete('tenants', id);
      
      return {
        success: response.success,
        error: response.error
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete tenant'
      };
    }
  }

  async suspendTenant(id: string): Promise<ServiceResult<boolean>> {
    try {
      const response = await ApiFactory.put<any>('tenants', id, { 
        status: TenantStatus.SUSPENDED 
      });
      
      return {
        success: response.success,
        data: response.success,
        error: response.error
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to suspend tenant'
      };
    }
  }

  async reactivateTenant(id: string): Promise<ServiceResult<boolean>> {
    try {
      const response = await ApiFactory.put<any>('tenants', id, { 
        status: TenantStatus.ACTIVE 
      });
      
      return {
        success: response.success,
        data: response.success,
        error: response.error
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to reactivate tenant'
      };
    }
  }

  async getMetrics(tenantId: string): Promise<ServiceResult<any>> {
    try {
      const response = await ApiFactory.get<any>(`tenants/${tenantId}/metrics`);
      
      if (response.success && response.data) {
        return {
          success: true,
          data: response.data
        };
      }
      
      return {
        success: false,
        error: response.error || 'Failed to fetch metrics'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch metrics'
      };
    }
  }

  // Utility methods for UI display
  getStatusBadgeVariant(status: TenantStatus): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
      case TenantStatus.ACTIVE:
        return "default";
      case TenantStatus.TRIAL:
        return "secondary";
      case TenantStatus.SUSPENDED:
      case TenantStatus.CANCELLED:
        return "destructive";
      case TenantStatus.ARCHIVED:
      case TenantStatus.PENDING_APPROVAL:
        return "outline";
      default:
        return "outline";
    }
  }

  getPlanBadgeVariant(plan: SubscriptionPlan): "default" | "secondary" | "destructive" | "outline" {
    switch (plan) {
      case SubscriptionPlan.KISAN_BASIC:
        return "secondary";
      case SubscriptionPlan.SHAKTI_GROWTH:
        return "default";
      case SubscriptionPlan.AI_ENTERPRISE:
        return "destructive";
      case SubscriptionPlan.CUSTOM:
        return "outline";
      default:
        return "outline";
    }
  }

  getPlanDisplayName(plan: SubscriptionPlan): string {
    switch (plan) {
      case SubscriptionPlan.KISAN_BASIC:
        return "Kisan Basic";
      case SubscriptionPlan.SHAKTI_GROWTH:
        return "Shakti Growth";
      case SubscriptionPlan.AI_ENTERPRISE:
        return "AI Enterprise";
      case SubscriptionPlan.CUSTOM:
        return "Custom Plan";
      default:
        return "Unknown Plan";
    }
  }
}

export const tenantService = new TenantService();
