import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type RunSummary = {
  run_started_at: string;
  duration_seconds: number | null;
  lookback_days: number | null;
  lands_eligible: number | null;
  lands_processed: number | null;
  lands_completed: number | null;
  lands_skipped: number | null;
  lands_failed: number | null;
  skip_rate_pct: number | null;
  observations_written: number | null;
  lands_via_optical: number | null;
  lands_via_radar: number | null;
  tenant_id: string | null;
  notes: Record<string, unknown> | null;
};

export type DecisionGradeRow = {
  land_id: string;
  tenant_id: string | null;
  acquisition_date: string;
  acquisition_time: string | null;
  scene_id: string | null;
  ndvi_value: number | null;
  savi_value: number | null;
  ndre_value: number | null;
  ndmi_value: number | null;
  mcari_value: number | null;
  ndvi_spatial_std: number | null;
  uniformity_cv: number | null;
  quality_score: number | null;
  confidence_level: string | null;
  cloud_cover: number | null;
  observation_source: string | null;
  effective_pixel_count: number | null;
  coverage_weighted_purity: number | null;
  boundary_contamination_fraction: number | null;
  ndvi_spatial_se: number | null;
  evidence_confidence: string | null;
  measurement_status: string | null;
  spatial_stat_method: string | null;
  age_days: number | null;
  is_fresh: boolean | null;
  recency_rank: number | null;
};

export type WaterLayerRow = {
  tenant_id: string;
  land_id: string;
  scene_id: string;
  acquisition_date: string;
  acquisition_time: string | null;
  layer_code: 'surface_water_trace' | 'canopy_moisture_signal';
  value_mean: number | null;
  value_median: number | null;
  value_p10: number | null;
  value_p90: number | null;
  value_min: number | null;
  value_max: number | null;
  valid_fraction: number | null;
  effective_pixel_count: number | null;
  image_path: string | null;
  image_metadata: Record<string, unknown> | null;
  evidence_json: Record<string, unknown> | null;
  provenance_json: Record<string, unknown> | null;
  status: string | null;
};

export type NdviProcessingLog = {
  id: string;
  processing_step: string;
  step_status: string;
  tenant_id: string | null;
  land_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
};

type QueryOptions = { tenantId?: string | null };

export function useNdviRunSummary(options: QueryOptions = {}) {
  return useQuery({
    queryKey: ['ndvi-run-summary', options.tenantId ?? 'all'],
    staleTime: 60_000,
    queryFn: async (): Promise<RunSummary | null> => {
      let q = supabase
        .from('ndvi_run_summary' as any)
        .select('run_started_at,duration_seconds,lookback_days,lands_eligible,lands_processed,lands_completed,lands_skipped,lands_failed,skip_rate_pct,observations_written,lands_via_optical,lands_via_radar,tenant_id,notes')
        .order('run_started_at', { ascending: false })
        .limit(1);
      if (options.tenantId) q = q.eq('tenant_id', options.tenantId);
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      return (data ?? null) as RunSummary | null;
    },
  });
}

export function useNdviDecisionGrade(daysBack = 120, options: QueryOptions = {}) {
  const since = new Date(Date.now() - daysBack * 86400_000).toISOString().slice(0, 10);
  return useQuery({
    queryKey: ['ndvi-decision-grade', daysBack, options.tenantId ?? 'all'],
    staleTime: 60_000,
    queryFn: async (): Promise<DecisionGradeRow[]> => {
      let q = supabase
        .from('v_ndvi_decision_grade' as any)
        .select('land_id,tenant_id,acquisition_date,acquisition_time,scene_id,ndvi_value,savi_value,ndre_value,ndmi_value,mcari_value,ndvi_spatial_std,uniformity_cv,quality_score,confidence_level,cloud_cover,observation_source,effective_pixel_count,coverage_weighted_purity,boundary_contamination_fraction,ndvi_spatial_se, evidence_confidence,measurement_status,spatial_stat_method,age_days,is_fresh,recency_rank')
        .gte('acquisition_date', since)
        .order('acquisition_date', { ascending: true })
        .limit(10000);
      if (options.tenantId) q = q.eq('tenant_id', options.tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as DecisionGradeRow[];
    },
  });
}

export function useNdviProcessingLogs(daysBack = 7, options: QueryOptions = {}) {
  const since = new Date(Date.now() - daysBack * 86400_000).toISOString();
  return useQuery({
    queryKey: ['ndvi-processing-logs', daysBack, options.tenantId ?? 'all'],
    staleTime: 60_000,
    queryFn: async (): Promise<NdviProcessingLog[]> => {
      let q = supabase
        .from('ndvi_processing_logs' as any)
        .select('id,processing_step,step_status,tenant_id,land_id,started_at,completed_at,duration_ms,error_message,metadata')
        .gte('started_at', since)
        .order('started_at', { ascending: false })
        .limit(2000);
      if (options.tenantId) q = q.eq('tenant_id', options.tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as NdviProcessingLog[];
    },
  });
}

export function useNdviWaterLayers(daysBack = 120, options: QueryOptions = {}) {
  const since = new Date(Date.now() - daysBack * 86400_000).toISOString().slice(0, 10);
  return useQuery({
    queryKey: ['ndvi-water-layers', daysBack, options.tenantId ?? 'all'],
    staleTime: 60_000,
    queryFn: async (): Promise<WaterLayerRow[]> => {
      let q = supabase
        .from('satellite_water_layers' as any)
        .select('tenant_id,land_id,scene_id,acquisition_date,acquisition_time,layer_code,value_mean,value_median,value_p10,value_p90,value_min,value_max,valid_fraction,effective_pixel_count,image_path,image_metadata,evidence_json,provenance_json,status')
        .gte('acquisition_date', since)
        .order('acquisition_date', { ascending: false })
        .limit(10000);
      if (options.tenantId) q = q.eq('tenant_id', options.tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as WaterLayerRow[];
    },
  });
}

export function useNdviTenants() {
  return useQuery({
    queryKey: ['ndvi-tenants'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Array<{ id: string; name: string }>> => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id,name')
        .order('name')
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
  });
}
