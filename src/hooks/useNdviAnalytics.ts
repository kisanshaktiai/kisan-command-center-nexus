import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NdviRow {
  ndvi_id: string;
  tenant_id: string | null;
  land_id: string;
  date: string;
  ndvi_value: number | null;
  ndwi_value: number | null;
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
  farmer_mobile: string | null;
  ndvi_thumbnail_url: string | null;
}

const SELECT = `ndvi_id, tenant_id, land_id, date, ndvi_value, ndwi_value, ndvi_std,
  cloud_cover, satellite_source, land_name, village, district, state, area_acres,
  farmer_id, farmer_code, farmer_name, farmer_mobile, ndvi_thumbnail_url`;

/** Fetch the NDVI window for analytics. Server enforces tenant RLS. */
export function useNdviAnalytics(daysBack = 120) {
  const since = new Date(Date.now() - daysBack * 86400_000).toISOString().slice(0, 10);
  return useQuery({
    queryKey: ['ndvi-analytics', daysBack],
    staleTime: 60_000,
    queryFn: async (): Promise<NdviRow[]> => {
      const { data, error } = await supabase
        .from('ndvi_full_view' as any)
        .select(SELECT)
        .gte('date', since)
        .order('date', { ascending: false })
        .limit(10000);
      if (error) throw error;
      return (data ?? []) as unknown as NdviRow[];
    },
  });
}

/** Coverage KPIs derived from ndvi_data + lands counts. */
export function useNdviCoverage() {
  return useQuery({
    queryKey: ['ndvi-coverage'],
    staleTime: 60_000,
    queryFn: async () => {
      const today = new Date();
      const dayStr = (n: number) =>
        new Date(today.getTime() - n * 86400_000).toISOString().slice(0, 10);

      const [landsRes, ndvi7, ndvi14, ndvi30, logs] = await Promise.all([
        supabase.from('lands').select('id, tenant_id', { count: 'exact', head: true }),
        supabase
          .from('ndvi_data')
          .select('land_id')
          .gte('date', dayStr(7)),
        supabase
          .from('ndvi_data')
          .select('land_id')
          .gte('date', dayStr(14)),
        supabase
          .from('ndvi_data')
          .select('land_id, date')
          .gte('date', dayStr(30)),
        supabase
          .from('ndvi_processing_logs')
          .select('id, status, created_at')
          .gte('created_at', dayStr(7))
          .limit(2000),
      ]);

      const uniq = (arr: any[] | null) =>
        new Set((arr ?? []).map((r: any) => r.land_id)).size;

      const dailyMap = new Map<string, number>();
      (ndvi30.data ?? []).forEach((r: any) => {
        dailyMap.set(r.date, (dailyMap.get(r.date) ?? 0) + 1);
      });
      const daily = Array.from(dailyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, count]) => ({ date, count }));

      const logRows = (logs.data ?? []) as any[];
      const succ = logRows.filter((l) => /success|complet/i.test(l.status)).length;

      return {
        totalLands: landsRes.count ?? 0,
        lands7: uniq(ndvi7.data),
        lands14: uniq(ndvi14.data),
        lands30: uniq(ndvi30.data),
        pipelineRuns7: logRows.length,
        pipelineSuccess7: succ,
        daily,
      };
    },
  });
}

/** Stale lands: have boundary but no NDVI in last N days. */
export function useStaleLands(daysWithout = 14) {
  return useQuery({
    queryKey: ['ndvi-stale-lands', daysWithout],
    staleTime: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - daysWithout * 86400_000)
        .toISOString()
        .slice(0, 10);

      const [{ data: lands }, { data: recent }] = await Promise.all([
        supabase
          .from('lands')
          .select('id, name, tenant_id, current_crop, area_acres')
          .limit(2000),
        supabase
          .from('ndvi_data')
          .select('land_id, date')
          .gte('date', since)
          .limit(10000),
      ]);

      const recentSet = new Set((recent ?? []).map((r: any) => r.land_id));
      return ((lands ?? []) as any[]).filter((l) => !recentSet.has(l.id));
    },
  });
}
