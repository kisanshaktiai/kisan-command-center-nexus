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

