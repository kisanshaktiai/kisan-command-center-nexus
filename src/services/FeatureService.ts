
import { supabase } from '@/integrations/supabase/client';

export class FeatureService {
  // Check if a tenant has access to a specific feature
  static async checkFeatureAccess(tenantId: string, featureName: string): Promise<boolean> {
    try {
      const { data: tenantFeatures, error } = await supabase
        .from('tenant_features')
        .select(featureName)
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        console.error('Error checking feature access:', error);
        return false;
      }

      return tenantFeatures?.[featureName] || false;
    } catch (error) {
      console.error('Error in checkFeatureAccess:', error);
      return false;
    }
  }

  // Get all features for a tenant
  static async getTenantFeatures(tenantId: string) {
    try {
      const { data: tenantFeatures, error } = await supabase
        .from('tenant_features')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        console.error('Error getting tenant features:', error);
        return null;
      }

      return tenantFeatures;
    } catch (error) {
      console.error('Error in getTenantFeatures:', error);
      return null;
    }
  }

  // Check subscription status and disable features if expired
  static async checkAndUpdateExpiredSubscriptions() {
    try {
      // This would typically be called by a cron job or background task
      const { error } = await supabase.rpc('disable_expired_tenant_features');

      if (error) {
        console.error('Error updating expired subscriptions:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in checkAndUpdateExpiredSubscriptions:', error);
      return false;
    }
  }

  // Enable/disable specific features for a tenant
  static async updateTenantFeature(tenantId: string, featureName: string, enabled: boolean) {
    try {
      const { error } = await supabase
        .from('tenant_features')
        .update({ [featureName]: enabled, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('Error updating tenant feature:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateTenantFeature:', error);
      return false;
    }
  }

  // Get subscription status for a tenant
  static async getSubscriptionStatus(tenantId: string) {
    try {
      const { data: subscription, error } = await supabase
        .from('tenant_subscriptions')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        console.error('Error getting subscription status:', error);
        return null;
      }

      // Check if subscription is expired
      const isExpired = new Date(subscription.current_period_end) < new Date();
      
      return {
        ...subscription,
        is_expired: isExpired,
        is_active: subscription.status === 'active' && !isExpired
      };
    } catch (error) {
      console.error('Error in getSubscriptionStatus:', error);
      return null;
    }
  }
}
