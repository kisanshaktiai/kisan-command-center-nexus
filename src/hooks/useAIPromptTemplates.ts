import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface AIPromptTemplate {
  id: string;
  key: string;
  name: string;
  description: string | null;
  target_table: string;
  model: string;
  temperature: number;
  system_prompt: string;
  user_prompt_template: string;
  variables_schema: any;
  output_schema: any;
  dedupe_keys: any;
  auto_apply: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useAIPromptTemplates(activeOnly = false) {
  return useQuery({
    queryKey: ['ai-prompt-templates', activeOnly],
    queryFn: async () => {
      let q = (supabase as any).from('ai_prompt_templates').select('*').order('target_table').order('name');
      if (activeOnly) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AIPromptTemplate[];
    },
  });
}

export function useAIPromptTemplate(id?: string) {
  return useQuery({
    queryKey: ['ai-prompt-template', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('ai_prompt_templates').select('*').eq('id', id).single();
      if (error) throw error;
      return data as AIPromptTemplate;
    },
  });
}

export function useSaveAIPromptTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<AIPromptTemplate> & { id?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload: any = { ...input, updated_by: user?.id };
      if (input.id) {
        const { id, ...rest } = payload;
        const { error } = await (supabase as any).from('ai_prompt_templates').update(rest).eq('id', id);
        if (error) throw error;
        return id;
      } else {
        payload.created_by = user?.id;
        const { data, error } = await (supabase as any).from('ai_prompt_templates').insert(payload).select('id').single();
        if (error) throw error;
        return data.id as string;
      }
    },
    onSuccess: () => {
      toast({ title: 'Template saved' });
      qc.invalidateQueries({ queryKey: ['ai-prompt-templates'] });
    },
    onError: (e: any) => toast({ title: 'Save failed', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteAIPromptTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('ai_prompt_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Template deleted' });
      qc.invalidateQueries({ queryKey: ['ai-prompt-templates'] });
    },
    onError: (e: any) => toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }),
  });
}

export function useDraftWithTemplate() {
  return useMutation({
    mutationFn: async (input: { template_id?: string; template_key?: string; variables: Record<string, any>; persist?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('governance-ai-builder', {
        body: { action: 'draft', ...input },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).hint || (data as any).error);
      return data as { draft: any; warnings: string[]; duplicates: any[]; template: AIPromptTemplate; run_id: string | null };
    },
    onError: (e: any) => toast({ title: 'Draft failed', description: e.message, variant: 'destructive' }),
  });
}

export function useApplyDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { run_id: string; payload?: any; mode?: 'queue' | 'direct'; notes?: string }) => {
      const { data, error } = await supabase.functions.invoke('governance-ai-builder', {
        body: { action: 'apply', ...input },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { ok: boolean; mode: string; record_id?: string; workflow_id?: string };
    },
    onSuccess: (d) => {
      toast({ title: d.mode === 'direct' ? 'Applied directly' : 'Submitted to approval queue' });
      qc.invalidateQueries({ queryKey: ['approval-queue'] });
      qc.invalidateQueries({ queryKey: ['ai-prompt-runs'] });
    },
    onError: (e: any) => toast({ title: 'Apply failed', description: e.message, variant: 'destructive' }),
  });
}

export function usePromptRuns(template_id?: string) {
  return useQuery({
    queryKey: ['ai-prompt-runs', template_id],
    enabled: !!template_id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('ai_prompt_runs')
        .select('*')
        .eq('template_id', template_id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });
}
