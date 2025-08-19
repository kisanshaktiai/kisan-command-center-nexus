
import { BaseService, ServiceResult } from '@/services/BaseService';
import { tenantApiService } from '@/services/api/TenantApiService';
import { CreateTenantDTO, UpdateTenantDTO, TenantFilters, Tenant } from '@/types/tenant';
import { UserTenantService } from '@/services/UserTenantService';
import { supabase } from '@/integrations/supabase/client';
import { SYSTEM_ROLE_CODES } from '@/types/roles';

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

        console.log('TenantManagementService: Creating tenant via edge function with data:', {
          name: data.name,
          slug: data.slug,
          owner_email: data.owner_email,
          owner_name: data.owner_name
        });

        // Use the create-tenant-with-admin edge function for complete tenant setup
        const { data: response, error } = await supabase.functions.invoke('create-tenant-with-admin', {
          body: {
            name: data.name,
            slug: data.slug,
            type: data.type || 'agri_company',
            status: data.status || 'trial',
            subscription_plan: data.subscription_plan || 'Kisan_Basic',
            owner_email: data.owner_email,
            owner_name: data.owner_name,
            owner_phone: data.owner_phone,
            business_registration: data.business_registration,
            business_address: data.business_address,
            established_date: data.established_date,
            subscription_start_date: data.subscription_start_date,
            subscription_end_date: data.subscription_end_date,
            trial_ends_at: data.trial_ends_at,
            max_farmers: data.max_farmers || 1000,
            max_dealers: data.max_dealers || 50,
            max_products: data.max_products || 100,
            max_storage_gb: data.max_storage_gb || 10,
            max_api_calls_per_day: data.max_api_calls_per_day || 10000,
            subdomain: data.subdomain,
            custom_domain: data.custom_domain,
            metadata: data.metadata || {}
          },
          headers: {
            'x-request-id': `tenant-create-${Date.now()}`,
            'x-correlation-id': `tenant-create-corr-${Date.now()}`,
            'idempotency-key': `tenant-create-${data.slug}-${Date.now()}`
          }
        });

        if (error) {
          console.error('TenantManagementService: Edge function error:', error);
          throw new Error(error.message || 'Failed to create tenant');
        }

        if (!response?.success) {
          console.error('TenantManagementService: Edge function returned error:', response);
          throw new Error(response?.error || 'Failed to create tenant');
        }

        console.log('TenantManagementService: Tenant created successfully via edge function:', response);

        // Fetch the created tenant to return proper Tenant object
        const tenantResult = await this.getTenantById(response.tenant_id);
        if (!tenantResult.success) {
          throw new Error('Failed to fetch created tenant details');
        }

        return tenantResult.data!;
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
