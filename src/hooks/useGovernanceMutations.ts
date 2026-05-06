import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useSimulateRule() {
  return useMutation({
    mutationFn: async ({ ruleId, sampleInput }: { ruleId: string; sampleInput: Record<string, any> }) => {
      const { data, error } = await (supabase as any).rpc('governance_simulate_rule', {
        p_rule_id: ruleId,
        p_sample_input: sampleInput,
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useTransitionApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workflowId, newState, notes }: { workflowId: string; newState: string; notes?: string }) => {
      const { data, error } = await (supabase as any).rpc('governance_transition_approval_state', {
        p_workflow_id: workflowId,
        p_new_state: newState,
        p_notes: notes ?? null,
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
    mutationFn: async ({ versionId, notes }: { versionId: string; notes?: string }) => {
      const { data, error } = await (supabase as any).schema('governance').rpc('rollback_rule_to_version', {
        p_version_id: versionId,
        p_notes: notes ?? null,
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
