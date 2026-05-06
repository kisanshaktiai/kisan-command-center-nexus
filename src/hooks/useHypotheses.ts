import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HypothesisRow {
  hypothesis_id: string;
  crop_group: string | null;
  hypothesis_type: string | null;
  canonical_group: string | null;
  cause_name_en: string | null;
  cause_name_hi: string | null;
  cause_name_mr: string | null;
  severity_model: string | null;
  is_active: boolean | null;
  version: string | null;
  updated_at: string;
}

export function useHypotheses(search: string, page = 0) {
  const PAGE_SIZE = 50;
  return useQuery({
    queryKey: ['hypotheses', search, page],
    queryFn: async () => {
      let q = supabase
        .from('hypothesis_master')
        .select('*', { count: 'exact' })
        .order('updated_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (search) {
        q = q.or(
          `hypothesis_id.ilike.%${search}%,cause_name_en.ilike.%${search}%,canonical_group.ilike.%${search}%`
        );
      }
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data || []) as HypothesisRow[], count: count || 0, pageSize: PAGE_SIZE };
    },
  });
}

export function useHypothesisDetail(hypothesisId: string | null) {
  return useQuery({
    queryKey: ['hypothesis-detail', hypothesisId],
    enabled: !!hypothesisId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hypothesis_master')
        .select('*')
        .eq('hypothesis_id', hypothesisId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useHypothesisVersions(hypothesisUuid: string | null) {
  return useQuery({
    queryKey: ['hypothesis-versions', hypothesisUuid],
    enabled: !!hypothesisUuid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hypothesis_versions')
        .select('id, version_number, change_type, change_reason, changed_by, created_at, snapshot')
        .eq('hypothesis_id', hypothesisUuid!)
        .order('version_number', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}
