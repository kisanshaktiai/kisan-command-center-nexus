
import { supabase } from '@/integrations/supabase/client';
import { CreateTenantDTO, UpdateTenantDTO, Tenant, convertDatabaseTenant } from '@/types/tenant';
import { TenantStatus, SubscriptionPlan } from '@/types/enums';

class TenantService {
  async createTenant(data: CreateTenantDTO): Promise<Tenant> {
    // Ensure required fields have defaults
    const insertData = {
      ...data,
      type: data.type || 'agri_company',
      status: data.status || 'trial',
      subscription_plan: data.subscription_plan || 'Kisan_Basic',
      business_address: data.business_address || {},
      metadata: data.metadata || {},
    };

    const { data: tenant, error } = await supabase
      .from('tenants')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create tenant: ${error.message}`);
    }

    return convertDatabaseTenant(tenant);
  }

  async updateTenant(id: string, data: UpdateTenantDTO): Promise<Tenant> {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update tenant: ${error.message}`);
    }

    return convertDatabaseTenant(tenant);
  }

  async deleteTenant(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('tenants')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete tenant: ${error.message}`);
    }

    return true;
  }

  getStatusBadgeVariant(status?: string | null): 'default' | 'secondary' | 'destructive' | 'outline' {
    if (!status) return 'outline';
    
    switch (status.toLowerCase()) {
      case TenantStatus.ACTIVE:
        return 'default';
      case TenantStatus.TRIAL:
        return 'secondary';
      case TenantStatus.SUSPENDED:
      case TenantStatus.CANCELLED:
        return 'destructive';
      case TenantStatus.ARCHIVED:
      case TenantStatus.PENDING_APPROVAL:
        return 'outline';
      default:
        return 'outline';
    }
  }

  getPlanBadgeVariant(plan?: string | null): 'default' | 'secondary' | 'destructive' | 'outline' {
    if (!plan) return 'outline';
    
    switch (plan) {
      case SubscriptionPlan.KISAN_BASIC:
        return 'outline';
      case SubscriptionPlan.SHAKTI_GROWTH:
        return 'secondary';
      case SubscriptionPlan.AI_ENTERPRISE:
        return 'default';
      case SubscriptionPlan.CUSTOM_ENTERPRISE:
        return 'destructive';
      default:
        return 'outline';
    }
  }

  getPlanDisplayName(plan?: string | null): string {
    if (!plan) return 'Unknown';
    
    switch (plan) {
      case SubscriptionPlan.KISAN_BASIC:
        return 'Kisan Basic';
      case SubscriptionPlan.SHAKTI_GROWTH:
        return 'Shakti Growth';
      case SubscriptionPlan.AI_ENTERPRISE:
        return 'AI Enterprise';
      case SubscriptionPlan.CUSTOM_ENTERPRISE:
        return 'Custom Enterprise';
      default:
        return plan;
    }
  }

  // Tenant status utilities
  isActive(status: string): boolean {
    return status === TenantStatus.ACTIVE;
  }

  isTrial(status: string): boolean {
    return status === TenantStatus.TRIAL;
  }

  isSuspended(status: string): boolean {
    return status === TenantStatus.SUSPENDED;
  }

  isArchived(status: string): boolean {
    return status === TenantStatus.ARCHIVED;
  }

  // Subscription utilities
  isBasicPlan(plan: string): boolean {
    return plan === SubscriptionPlan.KISAN_BASIC;
  }

  isGrowthPlan(plan: string): boolean {
    return plan === SubscriptionPlan.SHAKTI_GROWTH;
  }

  isEnterprisePlan(plan: string): boolean {
    return plan === SubscriptionPlan.AI_ENTERPRISE;
  }

  isCustomPlan(plan: string): boolean {
    return plan === SubscriptionPlan.CUSTOM_ENTERPRISE;
  }

  // Date utilities
  formatDate(dateString?: string): string {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  }

  isTrialExpired(trialEndsAt?: string): boolean {
    if (!trialEndsAt) return false;
    return new Date(trialEndsAt) < new Date();
  }

  getDaysUntilTrialExpiry(trialEndsAt?: string): number {
    if (!trialEndsAt) return 0;
    const trialEnd = new Date(trialEndsAt);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Validation utilities
  validateTenantSlug(slug: string): boolean {
    const slugRegex = /^[a-z0-9-]+$/;
    return slugRegex.test(slug) && slug.length >= 3 && slug.length <= 50;
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

export const tenantService = new TenantService();
