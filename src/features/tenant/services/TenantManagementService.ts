import { BaseService, ServiceResult } from '@/services/BaseService';
import { tenantApiService } from '@/services/api/TenantApiService';
import { CreateTenantDTO, UpdateTenantDTO, TenantFilters, Tenant } from '@/types/tenant';
import { UserTenantService } from '@/services/UserTenantService';
import { supabase } from '@/integrations/supabase/client';

// Type for RPC response
interface RPCResponse {
  success: boolean;
  error?: string;
  message?: string;
  tenant_id?: string;
  archive_job_id?: string;
}

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

  async getAllTenants(filters?: TenantFilters): Promise<ServiceResult<Tenant[]>> {
    return tenantApiService.getTenants(filters);
  }

  async getTenantById(id: string): Promise<ServiceResult<Tenant>> {
    return tenantApiService.getTenantById(id);
  }

  async createTenant(data: CreateTenantDTO): Promise<ServiceResult<Tenant>> {
    return this.executeOperation(
      async () => {
        // Validate tenant data before creation
        const validationResult = await this.validateTenantData(data);
        if (!validationResult.success) {
          throw new Error(validationResult.error || 'Validation failed');
        }

        // Create the tenant first
        const tenantResult = await tenantApiService.createTenant(data);
        if (!tenantResult.success) {
          throw new Error(tenantResult.error || 'Failed to create tenant');
        }

        const tenant = tenantResult.data!;

        // If owner_email is provided, create the user-tenant relationship
        if (data.owner_email && data.owner_name) {
          console.log('TenantManagementService: Creating tenant admin relationship for:', {
            tenantId: tenant.id,
            ownerEmail: data.owner_email,
            ownerName: data.owner_name
          });

          try {
            // First check if user exists in auth
            const { data: authUsers, error: authError } = await supabase.functions.invoke('get-user-by-email', {
              body: { user_email: data.owner_email }
            });

            if (authError) {
              console.warn('TenantManagementService: Could not check user existence:', authError);
            } else if (authUsers && Array.isArray(authUsers) && authUsers.length > 0) {
              const authUser = authUsers[0];
              console.log('TenantManagementService: Found existing user, creating tenant relationship');

              // Create user-tenant relationship using the corrected service
              const relationshipResult = await UserTenantService.createTenantAdminRelationship(
                authUser.id,
                tenant.id,
                {
                  created_via: 'tenant_creation',
                  owner_email: data.owner_email,
                  owner_name: data.owner_name
                }
              );

              if (!relationshipResult.success) {
                console.error('TenantManagementService: Failed to create tenant admin relationship:', relationshipResult.error);
                // Don't fail tenant creation, just log the warning
                console.warn('TenantManagementService: Tenant created but admin relationship failed. Manual setup may be required.');
              } else {
                console.log('TenantManagementService: Successfully created tenant admin relationship');
              }
            } else {
              console.log('TenantManagementService: User does not exist in auth, tenant created without initial admin relationship');
            }
          } catch (relationshipError) {
            console.error('TenantManagementService: Error creating tenant admin relationship:', relationshipError);
            // Don't fail tenant creation, just log the warning
            console.warn('TenantManagementService: Tenant created but admin relationship setup failed. Manual setup may be required.');
          }
        }

        return tenant;
      },
      'createTenant'
    );
  }

  async updateTenant(id: string, data: UpdateTenantDTO): Promise<ServiceResult<Tenant>> {
    return tenantApiService.updateTenant(id, data);
  }

  async suspendTenant(id: string, reason?: string): Promise<ServiceResult<boolean>> {
    return this.executeOperation(
      async () => {
        const { data, error } = await supabase.rpc('suspend_tenant', {
          p_tenant_id: id,
          p_reason: reason || 'Suspended by admin'
        });

        if (error) {
          throw new Error(error.message);
        }

        const result = data as unknown as RPCResponse;
        if (!result?.success) {
          throw new Error(result?.error || 'Failed to suspend tenant');
        }

        return true;
      },
      'suspendTenant'
    );
  }

  async reactivateTenant(id: string): Promise<ServiceResult<boolean>> {
    return this.executeOperation(
      async () => {
        const { data, error } = await supabase.rpc('reactivate_tenant', {
          p_tenant_id: id
        });

        if (error) {
          throw new Error(error.message);
        }

        const result = data as unknown as RPCResponse;
        if (!result?.success) {
          throw new Error(result?.error || 'Failed to reactivate tenant');
        }

        return true;
      },
      'reactivateTenant'
    );
  }

  // Archive tenant after 30 days of suspension
  async archiveTenant(id: string, archiveLocation: string, encryptionKeyId: string): Promise<ServiceResult<boolean>> {
    return this.executeOperation(
      async () => {
        const { data, error } = await supabase.rpc('archive_tenant_data', {
          p_tenant_id: id,
          p_archive_location: archiveLocation,
          p_encryption_key_id: encryptionKeyId
        });

        if (error) {
          throw new Error(error.message);
        }

        const result = data as unknown as RPCResponse;
        if (!result?.success) {
          throw new Error(result?.error || 'Failed to archive tenant');
        }

        return true;
      },
      'archiveTenant'
    );
  }

  // Legacy delete method - now redirects to suspend
  async deleteTenant(id: string): Promise<ServiceResult<boolean>> {
    // Instead of hard delete, suspend the tenant
    return this.suspendTenant(id, 'Deleted by admin - converted to suspension');
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
