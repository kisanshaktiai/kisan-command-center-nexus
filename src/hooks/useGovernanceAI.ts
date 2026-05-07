import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface RuleDraft {
  crop_code: string;
  stage: string;
  observation: string;
  plant_part?: string;
  action_type?: string;
  ipm_level?: string;
  bee_toxicity?: string;
  confidence?: number;
  conditions_json?: Record<string, any>;
  narration: { en: string; hi?: string; mr?: string };
  rationale: string;
}

export function useDraftRule() {
  return useMutation({
    mutationFn: async (input: {
      crop_code: string;
      stage: string;
      observation: string;
      plant_part?: string;
      intent?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('governance-rule-assistant', {
        body: input,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { draft: RuleDraft; warnings: string[]; duplicates: any[] };
    },
    onError: (e: any) => toast({ title: 'Draft failed', description: e.message, variant: 'destructive' }),
  });
}

export function useSubmitDraftAsProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ draft, notes }: { draft: RuleDraft; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('rule_approval_workflow')
        .insert({
          state: 'draft',
          submitted_by: user.id,
          submitted_at: new Date().toISOString(),
          proposed_payload: draft as any,
          agronomist_notes: notes ?? null,
          metadata: { source: 'ai_rule_builder' },
        })
        .select('id')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Draft submitted to approval queue' });
      qc.invalidateQueries({ queryKey: ['approval-queue'] });
    },
    onError: (e: any) => toast({ title: 'Submit failed', description: e.message, variant: 'destructive' }),
  });
}

export interface NarrationVerdict {
  verdict: 'clean' | 'suspect' | 'hallucinated';
  hallucination_score: number;
  flagged_terms: string[];
  reasoning: string;
}

export function useValidateNarration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      ai_content: string;
      rules_applied: any[];
      source_type?: string;
      source_id?: string;
      persist?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('governance-narration-validate', {
        body: input,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { judge: NarrationVerdict; log_id: string | null };
    },
    onSuccess: (_d, vars) => {
      if (vars.persist) qc.invalidateQueries({ queryKey: ['hallucination-logs'] });
    },
    onError: (e: any) => toast({ title: 'Validation failed', description: e.message, variant: 'destructive' }),
  });
}

export function useHallucinationLogs(verdict?: string) {
  return useQuery({
    queryKey: ['hallucination-logs', verdict],
    queryFn: async () => {
      let q = (supabase as any)
        .from('hallucination_detection_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (verdict && verdict !== 'all') q = q.eq('verdict', verdict);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useUpdateHallucinationVerdict() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, verdict, notes }: { id: string; verdict: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any)
        .from('hallucination_detection_logs')
        .update({
          verdict,
          reviewer_id: user?.id ?? null,
          reviewer_notes: notes ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Verdict updated' });
      qc.invalidateQueries({ queryKey: ['hallucination-logs'] });
    },
    onError: (e: any) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  });
}
