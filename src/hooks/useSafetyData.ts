import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useChemicalRegulatory(search: string) {
  return useQuery({
    queryKey: ['chemical-regulatory', search],
    queryFn: async () => {
      let q = supabase
        .from('chemical_regulatory_status')
        .select('*')
        .order('chemical_name')
        .limit(500);
      if (search) q = q.ilike('chemical_name', `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useEtlStandards(search: string, cropCode: string | null) {
  return useQuery({
    queryKey: ['etl-standards', search, cropCode],
    queryFn: async () => {
      let q = supabase
        .from('etl_standards')
        .select('*')
        .order('crop_code')
        .limit(500);
      if (search) q = q.or(`pest_name_en.ilike.%${search}%,pest_code.ilike.%${search}%`);
      if (cropCode) q = q.eq('crop_code', cropCode);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function usePhiReiMatrix(cropCode: string | null) {
  return useQuery({
    queryKey: ['phi-rei-matrix', cropCode],
    queryFn: async () => {
      let q = supabase
        .from('decision_rules')
        .select('rule_id, crop_code, active_ingredient, phi_days, reentry_interval_hours, bee_toxicity, regulatory_status')
        .not('phi_days', 'is', null)
        .order('crop_code')
        .limit(500);
      if (cropCode) q = q.eq('crop_code', cropCode);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}
