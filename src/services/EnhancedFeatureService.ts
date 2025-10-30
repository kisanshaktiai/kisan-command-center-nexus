import { supabase } from '@/integrations/supabase/client';

export interface FeatureFlag {
  id: string;
  flag_name: string;
  description: string | null;
  is_enabled: boolean;
  rollout_percentage: number;
  target_tenants: string[] | null;
  flag_type: 'release' | 'experiment' | 'operational' | 'permission';
  flag_status: 'active' | 'archived' | 'deprecated';
  tags: string[];
  environment_id: string;
  created_at: string;
  updated_at: string;
}

export interface FeatureFlagStats {
  total: number;
  active: number;
  experiments: number;
  targeted: number;
  totalEvaluationsToday: number;
}

export interface FeatureFlagAuditLog {
  id: string;
  flag_id: string;
  changed_by: string | null;
  action: string;
  old_value: any;
  new_value: any;
  change_reason: string | null;
  created_at: string;
  feature_flags: {
    flag_name: string;
  };
}

export interface TenantOverride {
  id: string;
  tenant_id: string;
  flag_id: string;
  override_enabled: boolean;
  override_reason: string | null;
  expires_at: string | null;
  created_at: string;
  tenants: {
    name: string;
  };
  feature_flags: {
    flag_name: string;
  };
}

export interface FeatureFlagEvaluation {
  flag_name: string;
  total_evaluations: number;
  enabled_count: number;
  disabled_count: number;
  unique_tenants: number;
}

export class EnhancedFeatureService {
  // Get all feature flags with enhanced data
  static async getAllFlags(): Promise<FeatureFlag[]> {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as FeatureFlag[];
  }

  // Get feature flag statistics
  static async getStats(): Promise<FeatureFlagStats> {
    const { data: flags } = await supabase
      .from('feature_flags')
      .select('*');

    const { count: evaluationsToday } = await supabase
      .from('feature_flag_evaluations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date().toISOString().split('T')[0]);

    const total = flags?.length || 0;
    const active = flags?.filter(f => f.is_enabled && f.flag_status === 'active').length || 0;
    const experiments = flags?.filter(f => f.flag_type === 'experiment').length || 0;
    const targeted = flags?.filter(f => f.target_tenants && (f.target_tenants as any).length > 0).length || 0;

    return {
      total,
      active,
      experiments,
      targeted,
      totalEvaluationsToday: evaluationsToday || 0
    };
  }

  // Get audit log for feature flags
  static async getAuditLog(flagId?: string, limit = 50): Promise<FeatureFlagAuditLog[]> {
    let query = supabase
      .from('feature_flag_audit_log')
      .select(`
        *,
        feature_flags (
          flag_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (flagId) {
      query = query.eq('flag_id', flagId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Get tenant overrides
  static async getTenantOverrides(flagId?: string): Promise<TenantOverride[]> {
    let query = supabase
      .from('tenant_feature_overrides')
      .select(`
        *,
        tenants (
          name
        ),
        feature_flags (
          flag_name
        )
      `)
      .order('created_at', { ascending: false });

    if (flagId) {
      query = query.eq('flag_id', flagId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Create tenant override
  static async createTenantOverride(
    tenantId: string,
    flagId: string,
    enabled: boolean,
    reason?: string,
    expiresAt?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('tenant_feature_overrides')
      .insert({
        tenant_id: tenantId,
        flag_id: flagId,
        override_enabled: enabled,
        override_reason: reason,
        expires_at: expiresAt
      });

    if (error) throw error;
  }

  // Delete tenant override
  static async deleteTenantOverride(overrideId: string): Promise<void> {
    const { error } = await supabase
      .from('tenant_feature_overrides')
      .delete()
      .eq('id', overrideId);

    if (error) throw error;
  }

  // Get evaluation statistics by flag
  static async getEvaluationStats(days = 7): Promise<FeatureFlagEvaluation[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('feature_flag_evaluations')
      .select(`
        flag_id,
        evaluated_value,
        tenant_id,
        feature_flags (
          flag_name
        )
      `)
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    // Aggregate the data
    const stats = new Map<string, FeatureFlagEvaluation>();
    
    data?.forEach((evaluation: any) => {
      const flagName = evaluation.feature_flags?.flag_name || 'Unknown';
      
      if (!stats.has(flagName)) {
        stats.set(flagName, {
          flag_name: flagName,
          total_evaluations: 0,
          enabled_count: 0,
          disabled_count: 0,
          unique_tenants: 0
        });
      }

      const stat = stats.get(flagName)!;
      stat.total_evaluations++;
      
      if (evaluation.evaluated_value) {
        stat.enabled_count++;
      } else {
        stat.disabled_count++;
      }
    });

    // Count unique tenants per flag
    const uniqueTenantCounts = new Map<string, Set<string>>();
    data?.forEach((evaluation: any) => {
      const flagName = evaluation.feature_flags?.flag_name || 'Unknown';
      if (!uniqueTenantCounts.has(flagName)) {
        uniqueTenantCounts.set(flagName, new Set());
      }
      if (evaluation.tenant_id) {
        uniqueTenantCounts.get(flagName)!.add(evaluation.tenant_id);
      }
    });

    uniqueTenantCounts.forEach((tenants, flagName) => {
      const stat = stats.get(flagName);
      if (stat) {
        stat.unique_tenants = tenants.size;
      }
    });

    return Array.from(stats.values());
  }

  // Toggle feature flag
  static async toggleFlag(flagId: string, enabled: boolean): Promise<void> {
    const { error } = await supabase
      .from('feature_flags')
      .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
      .eq('id', flagId);

    if (error) throw error;
  }

  // Update rollout percentage
  static async updateRollout(flagId: string, percentage: number): Promise<void> {
    const { error } = await supabase
      .from('feature_flags')
      .update({ rollout_percentage: percentage, updated_at: new Date().toISOString() })
      .eq('id', flagId);

    if (error) throw error;
  }

  // Create new feature flag
  static async createFlag(flagData: Partial<FeatureFlag>): Promise<void> {
    const { data: prodEnv } = await supabase
      .from('feature_environments')
      .select('id')
      .eq('name', 'production')
      .single();

    const { error } = await supabase
      .from('feature_flags')
      .insert({
        flag_name: flagData.flag_name!,
        description: flagData.description,
        is_enabled: flagData.is_enabled || false,
        rollout_percentage: flagData.rollout_percentage || 0,
        target_tenants: flagData.target_tenants as any,
        flag_type: flagData.flag_type || 'release',
        flag_status: flagData.flag_status || 'active',
        tags: flagData.tags as any,
        environment_id: prodEnv?.id
      });

    if (error) throw error;
  }

  // Delete feature flag
  static async deleteFlag(flagId: string): Promise<void> {
    const { error } = await supabase
      .from('feature_flags')
      .delete()
      .eq('id', flagId);

    if (error) throw error;
  }
}
