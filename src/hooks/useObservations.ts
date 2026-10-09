import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const PAGE_SIZE = 50;

export function useObservations(search: string, page = 0) {
  return useQuery({
    queryKey: ['observations', search, page],
    queryFn: async () => {
      let q = supabase
        .from('observation_master')
        .select('*', { count: 'exact' })
        .order('updated_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (search) {
        q = q.or(
          `observation_code.ilike.%${search}%,description.ilike.%${search}%,canonical_group.ilike.%${search}%`
        );
      }
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: data || [], count: count || 0, pageSize: PAGE_SIZE };
    },
  });
}

export function useObservationTranslations(observationCode: string | null) {
  return useQuery({
    queryKey: ['observation-translations', observationCode],
    enabled: !!observationCode,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('observation_translations')
        .select('*')
        .eq('observation_code', observationCode!);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useObservationAliases(observationCode: string | null) {
  return useQuery({
    queryKey: ['observation-aliases', observationCode],
    enabled: !!observationCode,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('observation_aliases')
        .select('*')
        .eq('canonical_code', observationCode!);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useIntents() {
  return useQuery({
    queryKey: ['observation-intents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('observation_intent_master')
        .select('*')
        .order('intent_code');
      if (error) throw error;
      return data || [];
    },
  });
}

export function useIntentMappings(intentCode: string | null) {
  return useQuery({
    queryKey: ['intent-mappings', intentCode],
    enabled: !!intentCode,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('intent_observation_mapping')
        .select('*')
        .eq('intent_code', intentCode!)
        .order('confidence_rank', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useIntentTranslations(intentCode: string | null) {
  return useQuery({
    queryKey: ['intent-translations', intentCode],
    enabled: !!intentCode,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('intent_translations')
        .select('*')
        .eq('intent_code', intentCode!);
      if (error) throw error;
      return data || [];
    },
  });
}
