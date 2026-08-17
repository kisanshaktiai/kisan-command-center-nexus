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
  category?: string;
  actionType?: string;
  ipmLevel?: string;
  beeToxicity?: string;
  expertApproved?: string;
  active?: string;
}

/** Distinct crop / category / action values for the console filter bar. */
export function useRuleFacets() {
  return useQuery({
    queryKey: ['decision-rule-facets'],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('decision_rules')
        .select('crop_code, category, action_type')
        .limit(5000);
      if (error) throw error;
      const uniq = (key: 'crop_code' | 'category' | 'action_type') =>
        Array.from(
          new Set((data || []).map((r: any) => r[key]).filter((v): v is string => !!v))
        ).sort();
      return {
        crops: uniq('crop_code'),
        categories: uniq('category'),
        actions: uniq('action_type'),
      };
    },
  });
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

/* ------------------------------------------------------------------
 * QA findings + source evidence
 * NOTE ON JOIN KEYS: decision_rule_qa_findings.rule_id and
 * rule_source_evidence.rule_id are TEXT and join to decision_rules.rule_id
 * (NOT the uuid primary key).
 * ------------------------------------------------------------------ */

export interface FindingRow {
  id: string;
  finding_type: string;
  detail: string;
  detected_value: string | null;
  expected_value: string | null;
  status: string;
  resolved_by: string | null;
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface EvidenceSource {
  title: string;
  publisher: string;
  authority_tier: number;
  source_type: string;
  url: string | null;
  publication_year: number | null;
}

export interface EvidenceRow {
  id: string;
  claim_supported: string;
  evidence_role: string;
  added_by: string;
  added_at: string;
  knowledge_sources: EvidenceSource | null;
}

/** finding_type values that block publish — mirrors the DB safety gate. */
export const BLOCKING_FINDING_TYPES = [
  'FIELD_MISMATCH_SUSPECTED_SHIFT',
  'FIELD_MISMATCH_ACTIVE_INGREDIENT',
  'DUPLICATE_RULE_PAIR',
  'UNGATED_CHEMICAL_RULE',
  'BANNED_SUBSTANCE_REMOVED',
  'DOSE_LABEL_MISMATCH',
  'CLAIM_OVERREACH',
] as const;

export const OPEN_FINDING_STATUSES = ['open', 'needs_expert_review'];

export const isFindingOpen = (f: FindingRow) => OPEN_FINDING_STATUSES.includes(f.status);
export const isFindingBlocking = (f: FindingRow) =>
  isFindingOpen(f) && (BLOCKING_FINDING_TYPES as readonly string[]).includes(f.finding_type);

export function useRuleFindings(ruleTextId: string | null) {
  return useQuery({
    queryKey: ['rule-findings', ruleTextId],
    enabled: !!ruleTextId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('decision_rule_qa_findings')
        .select(
          'id, finding_type, detail, detected_value, expected_value, status, resolved_by, resolution_note, created_at, resolved_at'
        )
        .eq('rule_id', ruleTextId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as FindingRow[];
    },
  });
}

export function useRuleEvidence(ruleTextId: string | null) {
  return useQuery({
    queryKey: ['rule-evidence', ruleTextId],
    enabled: !!ruleTextId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rule_source_evidence')
        .select(
          'id, claim_supported, evidence_role, added_by, added_at, knowledge_sources(title, publisher, authority_tier, source_type, url, publication_year)'
        )
        .eq('rule_id', ruleTextId!)
        .order('added_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as EvidenceRow[];
    },
  });
}
