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


export function useApprovalQueue(stateFilter?: string) {
  return useQuery({
    queryKey: ['approval-queue', stateFilter],
    queryFn: async () => {
      let q = supabase
        .from('rule_approval_workflow')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(500);
      if (stateFilter && stateFilter !== 'all') q = q.eq('state', stateFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}
