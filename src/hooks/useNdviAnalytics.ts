import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNdviDecisionGrade, DecisionGradeRow } from '@/components/ndvi/NdviReadModel';

export interface NdviRow {
  land_id: string;
  tenant_id: string | null;
  date: string;
  acquisition_time: string | null;
  scene_id: string | null;
  ndvi_value: number | null;
  ndmi_value: number | null;
  ndre_value: number | null;
  savi_value: number | null;
  ndvi_std: number | null;
  cloud_cover: number | null;
  satellite_source: string | null;
  land_name: string | null;
  village: string | null;
  district: string | null;
  state: string | null;
  area_acres: number | null;
  farmer_id: string | null;
  farmer_code: string | null;
  farmer_name: string | null;
  quality_score: number | null;
  confidence_level: string | null;
  evidence_confidence: string | null;
  measurement_status: string | null;
  effective_pixel_count: number | null;
  coverage_weighted_purity: number | null;
  boundary_contamination_fraction: number | null;
  ndvi_spatial_se: number | null;
  spatial_stat_method: string | null;
  is_fresh: boolean | null;
  age_days: number | null;
}

type LandMeta = {
  id: string;
  name: string | null;
  village: string | null;
  district: string | null;
  state: string | null;
  area_acres: number | null;
  current_crop: string | null;
  farmer_id: string | null;
  farmer_code: string | null;
  farmer_name: string | null;
};

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

function mergeRows(grades: DecisionGradeRow[], lands: LandMeta[]): NdviRow[] {
  const byLand = new Map(lands.map((land) => [land.id, land]));
  return grades.map((r) => {
    const land = byLand.get(r.land_id);
    return {
      land_id: r.land_id,
      tenant_id: r.tenant_id,
      date: r.acquisition_date,
      acquisition_time: r.acquisition_time,
      scene_id: r.scene_id,
      ndvi_value: toNumber(r.ndvi_value),
      ndmi_value: toNumber(r.ndmi_value),
      ndre_value: toNumber(r.ndre_value),
      savi_value: toNumber(r.savi_value),
      ndvi_std: toNumber(r.ndvi_spatial_std),
      cloud_cover: toNumber(r.cloud_cover),
      satellite_source: r.observation_source,
      land_name: land?.name ?? null,
      village: land?.village ?? null,
      district: land?.district ?? null,
      state: land?.state ?? null,
      area_acres: toNumber(land?.area_acres),
      farmer_id: land?.farmer_id ?? null,
      farmer_code: land?.farmer_code ?? null,
      farmer_name: land?.farmer_name ?? null,
      quality_score: toNumber(r.quality_score),
      confidence_level: r.confidence_level,
      evidence_confidence: r.evidence_confidence,
      measurement_status: r.measurement_status,
      effective_pixel_count: toNumber(r.effective_pixel_count),
      coverage_weighted_purity: toNumber(r.coverage_weighted_purity),
      boundary_contamination_fraction: toNumber(r.boundary_contamination_fraction),
      ndvi_spatial_se: toNumber(r.ndvi_spatial_se),
      spatial_stat_method: r.spatial_stat_method,
      is_fresh: r.is_fresh,
      age_days: r.age_days,
    };
  });
}

/**
 * Read-only analytics adapter.
 *
 * The canonical NDVI pipeline owns acquisition and science. This hook only
 * reads the decision-grade view and enriches rows with current land metadata.
 */
export function useNdviAnalytics(daysBack = 120, tenantId: string | null = null) {
  const grade = useNdviDecisionGrade(daysBack, { tenantId });

  const lands = useQuery({
    queryKey: ['ndvi-land-meta', tenantId ?? 'all'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<LandMeta[]> => {
      let q = supabase
        .from('lands')
        .select('id,name,village,district,state,area_acres,current_crop,farmer_id,farmer_code,farmer_name')
        .eq('is_active', true)
        .is('deleted_at', null)
        .limit(5000);
      if (tenantId) q = q.eq('tenant_id', tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as LandMeta[];
    },
  });

  return {
    data: grade.data && lands.data ? mergeRows(grade.data, lands.data) : undefined,
    isLoading: grade.isLoading || lands.isLoading,
    isError: grade.isError || lands.isError,
    error: grade.error ?? lands.error,
    refetch: async () => {
      await Promise.all([grade.refetch(), lands.refetch()]);
    },
  };
}

/**
 * Coverage is based on the canonical decision-grade read model.
 * Pipeline run health is read from ndvi_run_summary, not step-row counts.
 */
export function useNdviCoverage(tenantId: string | null = null) {
  const grade = useNdviDecisionGrade(30, { tenantId });
  const run = useQuery({
    queryKey: ['ndvi-run-summary', 'platform'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ndvi_run_summary' as any)
        .select('run_started_at,duration_seconds,lookback_days,lands_eligible,lands_processed,lands_completed,lands_skipped,lands_failed,skip_rate_pct,observations_written,lands_via_optical,lands_via_radar,tenant_id,notes')
        .is('tenant_id', null)
        .order('run_started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const lands = useQuery({
    queryKey: ['ndvi-coverage-total-lands', tenantId ?? 'all'],
    staleTime: 60_000,
    queryFn: async () => {
      let q = supabase.from('lands').select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .is('deleted_at', null);
      if (tenantId) q = q.eq('tenant_id', tenantId);
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    },
  });

  const uniqueFresh = (rows: DecisionGradeRow[], days: number) =>
    new Set(rows.filter((r) => {
      const age = r.age_days ?? Math.floor((Date.now() - new Date(r.acquisition_date).getTime()) / 86400000);
      return age <= days;
    }).map((r) => r.land_id)).size;

  const dailyMap = new Map<string, number>();
  (grade.data ?? []).forEach((r) => {
    dailyMap.set(r.acquisition_date, (dailyMap.get(r.acquisition_date) ?? 0) + 1);
  });

  return {
    data: {
      totalLands: lands.data ?? 0,
      lands7: uniqueFresh(grade.data ?? [], 7),
      lands14: uniqueFresh(grade.data ?? [], 14),
      lands30: uniqueFresh(grade.data ?? [], 30),
      daily: Array.from(dailyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, count]) => ({ date, count })),
      run: run.data ?? null,
    },
    isLoading: grade.isLoading || lands.isLoading || run.isLoading,
    isError: grade.isError || lands.isError || run.isError,
  };
}

export function useStaleLands(daysWithout = 14, tenantId: string | null = null) {
  const lands = useQuery({
    queryKey: ['ndvi-stale-lands', daysWithout, tenantId ?? 'all'],
    staleTime: 60_000,
    queryFn: async (): Promise<LandMeta[]> => {
      let q = supabase
        .from('lands')
        .select('id,name,village,district,state,area_acres,current_crop,farmer_id,farmer_code,farmer_name')
        .eq('is_active', true)
        .is('deleted_at', null)
        .limit(5000);
      if (tenantId) q = q.eq('tenant_id', tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as LandMeta[];
    },
  });

  const grade = useNdviDecisionGrade(daysWithout, { tenantId });

  const recentIds = new Set((grade.data ?? []).map((r) => r.land_id));
  const stale = (lands.data ?? []).filter((land) => !recentIds.has(land.id));

  return {
    data: stale,
    isLoading: lands.isLoading || grade.isLoading,
    isError: lands.isError || grade.isError,
  };
}
