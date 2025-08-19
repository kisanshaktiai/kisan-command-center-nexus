import { TenantStatus, SubscriptionPlan } from '@/types/enums';

class TenantService {
  getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
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

  getPlanBadgeVariant(plan: string): 'default' | 'secondary' | 'destructive' | 'outline' {
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

  getPlanDisplayName(plan: string): string {
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

  // Resource limit utilities
  hasUnlimitedFarmers(maxFarmers?: number): boolean {
    return !maxFarmers || maxFarmers === -1;
  }

  hasUnlimitedDealers(maxDealers?: number): boolean {
    return !maxDealers || maxDealers === -1;
  }

  hasUnlimitedProducts(maxProducts?: number): boolean {
    return !maxProducts || maxProducts === -1;
  }

  hasUnlimitedStorage(maxStorageGb?: number): boolean {
    return !maxStorageGb || maxStorageGb === -1;
  }

  // Feature access utilities
  canAccessFeature(plan: string, feature: string): boolean {
    const featureMatrix: Record<string, string[]> = {
      [SubscriptionPlan.KISAN_BASIC]: ['basic_analytics', 'weather_forecast', 'marketplace'],
      [SubscriptionPlan.SHAKTI_GROWTH]: ['basic_analytics', 'advanced_analytics', 'weather_forecast', 'marketplace', 'community_forum'],
      [SubscriptionPlan.AI_ENTERPRISE]: ['basic_analytics', 'advanced_analytics', 'predictive_analytics', 'weather_forecast', 'marketplace', 'community_forum', 'ai_chat', 'satellite_imagery'],
      [SubscriptionPlan.CUSTOM_ENTERPRISE]: ['*'] // All features
    };

    const planFeatures = featureMatrix[plan] || [];
    return planFeatures.includes('*') || planFeatures.includes(feature);
  }

  // Tenant health utilities
  getTenantHealthScore(tenant: any): number {
    let score = 0;
    
    // Basic info completeness (30 points)
    if (tenant.name) score += 5;
    if (tenant.owner_name) score += 5;
    if (tenant.owner_email) score += 5;
    if (tenant.business_address) score += 5;
    if (tenant.business_registration) score += 5;
    if (tenant.established_date) score += 5;

    // Status health (40 points)
    if (tenant.status === TenantStatus.ACTIVE) score += 40;
    else if (tenant.status === TenantStatus.TRIAL) score += 20;
    else if (tenant.status === TenantStatus.PENDING_APPROVAL) score += 10;

    // Subscription health (30 points)
    if (tenant.subscription_start_date && tenant.subscription_end_date) {
      const now = new Date();
      const endDate = new Date(tenant.subscription_end_date);
      if (endDate > now) score += 30;
      else score += 10; // Expired but has subscription
    }

    return Math.min(score, 100);
  }

  getTenantHealthStatus(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }
}

export const tenantService = new TenantService();
