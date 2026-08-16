import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export type ApprovalState =
  | 'draft'
  | 'review'
  | 'approved'
  | 'published'
  | 'deprecated'
  | 'rejected';

export interface SimulateRuleVars {
  ruleId: string;
  sampleInput: Record<string, unknown>;
}

export interface TransitionApprovalVars {
  workflowId: string;
  newState: ApprovalState;
  notes?: string;
}

export interface RollbackToVersionVars {
  versionId: string;
  notes?: string;
}

export function useSimulateRule() {
  return useMutation({
    mutationFn: async ({ ruleId, sampleInput }: SimulateRuleVars) => {
      const { data, error } = await supabase.rpc('governance_simulate_rule', {
        p_rule_id: ruleId,
        p_sample_input: sampleInput as Json,
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useTransitionApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workflowId, newState, notes }: TransitionApprovalVars) => {
      const { data, error } = await supabase.rpc('governance_transition_approval_state', {
        p_workflow_id: workflowId,
        p_new_state: newState,
        p_notes: notes ?? undefined,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'State updated' });
      qc.invalidateQueries({ queryKey: ['approval-queue'] });
      qc.invalidateQueries({ queryKey: ['rule-approval'] });
    },
    onError: (e: any) => toast({ title: 'Transition failed', description: e.message, variant: 'destructive' }),
  });
}

export function useRollbackToVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ versionId, notes }: RollbackToVersionVars) => {
      const { data, error } = await supabase.rpc('governance_rollback_rule_to_version', {
        p_version_id: versionId,
        p_notes: notes ?? undefined,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Rollback staged as draft' });
      qc.invalidateQueries({ queryKey: ['approval-queue'] });
      qc.invalidateQueries({ queryKey: ['rule-approval'] });
      qc.invalidateQueries({ queryKey: ['rule-versions'] });
    },
    onError: (e: any) => toast({ title: 'Rollback failed', description: e.message, variant: 'destructive' }),
  });
}


const QUEUE_COLUMNS =
  'id, rule_id, state, submitted_by, reviewer_id, agronomist_notes, updated_at, created_at';

export const QUEUE_PAGE_SIZE = 100;

export interface ApprovalQueueRow {
  id: string;
  rule_id: string;
  state: string;
  submitted_by: string | null;
  reviewer_id: string | null;
  agronomist_notes: string | null;
  updated_at: string;
  created_at: string;
}

export function useApprovalQueue(stateFilter?: string, page = 0) {
  return useQuery({
    queryKey: ['approval-queue', stateFilter, page],
    queryFn: async () => {
      let q = supabase
        .from('rule_approval_workflow')
        .select(QUEUE_COLUMNS, { count: 'exact' })
        .order('updated_at', { ascending: false })
        .range(page * QUEUE_PAGE_SIZE, page * QUEUE_PAGE_SIZE + QUEUE_PAGE_SIZE - 1);
      if (stateFilter && stateFilter !== 'all') q = q.eq('state', stateFilter);
      const { data, error, count } = await q;
      if (error) throw error;
      return {
        rows: (data || []) as ApprovalQueueRow[],
        count: count || 0,
        pageSize: QUEUE_PAGE_SIZE,
      };
    },
  });
}

/** Loads the heavy proposed_payload only when a detail dialog is open. */
export function useApprovalWorkflowDetail(workflowId: string | null) {
  return useQuery({
    queryKey: ['approval-workflow-detail', workflowId],
    enabled: !!workflowId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rule_approval_workflow')
        .select('id, rule_id, state, proposed_payload, rejection_reason, metadata, rule_version_id, submitted_at, reviewed_at')
        .eq('id', workflowId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}


/* ------------------------------------------------------------------
 * Guarded write hooks — all writes go through governance_* RPCs.
 * NEVER update decision_rules / rule_approval_workflow from the client.
 * TODO(backend): these SECURITY DEFINER functions must exist with the same
 * is_super_admin() gate + publish safety logic as
 * governance.transition_approval_state:
 *   governance_update_rule_fields(p_rule_id uuid, p_fields jsonb)
 *   governance_resolve_finding(p_finding_id uuid, p_note text)
 *   governance_submit_rule_for_review(p_rule_uuid uuid, p_note text)
 *   governance_bulk_transition(p_workflow_ids uuid[], p_new_state text, p_note text)
 * Until then these hooks surface the DB error verbatim.
 * ------------------------------------------------------------------ */

// Types are not generated for these RPCs yet.
const rpc = (name: string, args: Record<string, unknown>) =>
  (supabase as any).rpc(name, args);

const dbMessage = (e: any) => e?.message || 'Unknown database error';

/** Whitelisted, agronomist-editable gate fields. */
export const EDITABLE_RULE_FIELDS = [
  'active_ingredient',
  'dosage_per_acre',
  'water_volume_per_acre',
  'phi_days',
  'phi_status',
  'application_method',
  'bee_toxicity',
  'regulatory_status',
  'confidence_score',
] as const;

export type EditableRuleField = (typeof EDITABLE_RULE_FIELDS)[number];

export function useUpdateRuleFields() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ruleUuid, fields }: { ruleUuid: string; fields: Record<string, unknown> }) => {
      const { data, error } = await rpc('governance_update_rule_fields', {
        p_rule_id: ruleUuid,
        p_fields: fields,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      toast({ title: 'Rule fields updated' });
      qc.invalidateQueries({ queryKey: ['decision-rule-detail', vars.ruleUuid] });
      qc.invalidateQueries({ queryKey: ['decision-rules'] });
    },
    onError: (e: any) =>
      toast({ title: 'Update refused', description: dbMessage(e), variant: 'destructive' }),
  });
}

export function useResolveFinding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ findingId, note }: { findingId: string; note?: string; ruleTextId?: string }) => {
      const { data, error } = await rpc('governance_resolve_finding', {
        p_finding_id: findingId,
        p_note: note ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      toast({ title: 'Finding resolved' });
      qc.invalidateQueries({ queryKey: ['rule-findings', vars.ruleTextId ?? null] });
      qc.invalidateQueries({ queryKey: ['rule-findings'] });
    },
    onError: (e: any) =>
      toast({ title: 'Could not resolve finding', description: dbMessage(e), variant: 'destructive' }),
  });
}

export function useSubmitForReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ruleUuid, note }: { ruleUuid: string; note?: string }) => {
      const { data, error } = await rpc('governance_submit_rule_for_review', {
        p_rule_uuid: ruleUuid,
        p_note: note ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      toast({ title: 'Submitted for review' });
      qc.invalidateQueries({ queryKey: ['rule-approval', vars.ruleUuid] });
      qc.invalidateQueries({ queryKey: ['approval-queue'] });
    },
    onError: (e: any) =>
      toast({ title: 'Submit refused', description: dbMessage(e), variant: 'destructive' }),
  });
}

export interface BulkTransitionResult {
  rule_id: string;
  result: string;
}

export function useBulkTransition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ruleUuids,
      newState,
      note,
    }: {
      ruleUuids: string[];
      newState: ApprovalState;
      note?: string;
    }) => {
      const { data, error } = await rpc('governance_bulk_transition', {
        p_workflow_ids: ruleUuids,
        p_new_state: newState,
        p_note: note ?? null,
      });
      if (error) throw error;
      return (Array.isArray(data) ? data : []) as BulkTransitionResult[];
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approval-queue'] });
      qc.invalidateQueries({ queryKey: ['decision-rules'] });
    },
    onError: (e: any) =>
      toast({ title: 'Bulk approval failed', description: dbMessage(e), variant: 'destructive' }),
  });
}
