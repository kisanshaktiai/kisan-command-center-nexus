import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DecisionRuleRow {
  id: string;
  rule_id: string;
  crop_code: string | null;
  crop_group: string | null;
  category: string | null;
  action_type: string | null;
  ipm_level: number | null;
  bee_toxicity: string | null;
  regulatory_status: string | null;
  expert_approved: boolean | null;
  confidence_score: number | null;
  is_active: boolean | null;
  rule_version: string | null;
  updated_at: string;
}

export interface RulesFilters {
  search?: string;
  cropCode?: string;
  ipmLevel?: string;
  beeToxicity?: string;
  expertApproved?: string;
  active?: string;
}

const PAGE_SIZE = 50;

export function useDecisionRules(filters: RulesFilters, page = 0) {
  return useQuery({
    queryKey: ['decision-rules', filters, page],
    queryFn: async () => {
      let q = supabase
        .from('decision_rules')
        .select(
          'id, rule_id, crop_code, crop_group, category, action_type, ipm_level, bee_toxicity, regulatory_status, expert_approved, confidence_score, is_active, rule_version, updated_at',
          { count: 'exact' }
        )
        .order('updated_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (filters.search) q = q.or(`rule_id.ilike.%${filters.search}%,crop_code.ilike.%${filters.search}%`);
      if (filters.cropCode) q = q.eq('crop_code', filters.cropCode);
      if (filters.ipmLevel) q = q.eq('ipm_level', Number(filters.ipmLevel));
      if (filters.beeToxicity) q = q.eq('bee_toxicity', filters.beeToxicity);
      if (filters.expertApproved === 'true') q = q.eq('expert_approved', true);
      if (filters.expertApproved === 'false') q = q.eq('expert_approved', false);
      if (filters.active === 'true') q = q.eq('is_active', true);
      if (filters.active === 'false') q = q.eq('is_active', false);

      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data || []) as DecisionRuleRow[], count: count || 0, pageSize: PAGE_SIZE };
    },
  });
}

export function useDecisionRuleDetail(id: string | null) {
  return useQuery({
    queryKey: ['decision-rule-detail', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('decision_rules').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useRulePerformance(ruleTextId: string | null) {
  return useQuery({
    queryKey: ['rule-performance', ruleTextId],
    enabled: !!ruleTextId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rule_performance')
        .select('*')
        .eq('rule_id', ruleTextId!);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useRuleVersions(ruleUuid: string | null) {
  return useQuery({
    queryKey: ['rule-versions', ruleUuid],
    enabled: !!ruleUuid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rule_versions')
        .select('id, version_number, change_type, change_reason, changed_by, created_at, snapshot')
        .eq('rule_id', ruleUuid!)
        .order('version_number', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useRuleConflicts(ruleUuid: string | null) {
  return useQuery({
    queryKey: ['rule-conflicts', ruleUuid],
    enabled: !!ruleUuid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rule_conflict_matrix')
        .select('*')
        .or(`rule_a_id.eq.${ruleUuid},rule_b_id.eq.${ruleUuid}`)
        .order('detected_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useRuleLineage(ruleUuid: string | null) {
  return useQuery({
    queryKey: ['rule-lineage', ruleUuid],
    enabled: !!ruleUuid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rule_lineage')
        .select('*')
        .or(`parent_rule_id.eq.${ruleUuid},child_rule_id.eq.${ruleUuid}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useRuleApproval(ruleUuid: string | null) {
  return useQuery({
    queryKey: ['rule-approval', ruleUuid],
    enabled: !!ruleUuid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rule_approval_workflow')
        .select('*')
        .eq('rule_id', ruleUuid!)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}
