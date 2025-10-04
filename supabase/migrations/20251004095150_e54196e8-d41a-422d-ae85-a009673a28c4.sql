-- Phase 2: Database Schema for Land-First NDVI Processing (Fixed)

-- Create land_clusters table for grouping nearby lands
CREATE TABLE IF NOT EXISTS public.land_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  cluster_key TEXT NOT NULL,
  land_ids UUID[] NOT NULL,
  cluster_bbox JSONB NOT NULL,
  bbox_area_km2 NUMERIC,
  land_count INTEGER NOT NULL,
  last_processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, cluster_key)
);

CREATE INDEX idx_land_clusters_tenant ON public.land_clusters(tenant_id);
CREATE INDEX idx_land_clusters_last_processed ON public.land_clusters(last_processed_at);

-- Create copernicus_api_calls table for API usage tracking
CREATE TABLE IF NOT EXISTS public.copernicus_api_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  cluster_id UUID REFERENCES public.land_clusters(id) ON DELETE SET NULL,
  land_id UUID REFERENCES public.lands(id) ON DELETE SET NULL,
  api_type TEXT NOT NULL CHECK (api_type IN ('catalog', 'statistical', 'process')),
  bbox_requested JSONB NOT NULL,
  bbox_area_km2 NUMERIC,
  pixels_requested INTEGER,
  data_size_mb NUMERIC,
  processing_units NUMERIC,
  cost_estimate NUMERIC,
  response_time_ms INTEGER,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  request_payload JSONB,
  response_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_copernicus_api_calls_tenant ON public.copernicus_api_calls(tenant_id, created_at DESC);
CREATE INDEX idx_copernicus_api_calls_cluster ON public.copernicus_api_calls(cluster_id);
CREATE INDEX idx_copernicus_api_calls_land ON public.copernicus_api_calls(land_id);
CREATE INDEX idx_copernicus_api_calls_api_type ON public.copernicus_api_calls(api_type);

CREATE TRIGGER update_land_clusters_updated_at
  BEFORE UPDATE ON public.land_clusters
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Fixed clustering function with proper RECORD type
CREATE OR REPLACE FUNCTION public.cluster_lands_for_ndvi(
  p_tenant_id UUID,
  p_max_distance_km NUMERIC DEFAULT 1.0,
  p_max_cluster_area_km2 NUMERIC DEFAULT 25.0
)
RETURNS TABLE (
  cluster_id INTEGER,
  land_ids UUID[],
  cluster_bbox JSONB,
  bbox_area_km2 NUMERIC,
  land_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cluster_num INTEGER := 1;
  rec RECORD;
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS temp_land_clusters (
    cluster_id INTEGER,
    land_id UUID,
    centroid GEOMETRY,
    boundary GEOMETRY
  ) ON COMMIT DROP;

  INSERT INTO temp_land_clusters (cluster_id, land_id, centroid, boundary)
  SELECT 
    0,
    l.id,
    ST_Centroid(l.boundary),
    l.boundary
  FROM public.lands l
  WHERE l.tenant_id = p_tenant_id
  AND l.is_active = true
  AND l.boundary IS NOT NULL;

  FOR rec IN 
    SELECT DISTINCT land_id, centroid, boundary 
    FROM temp_land_clusters 
    WHERE cluster_id = 0
  LOOP
    UPDATE temp_land_clusters
    SET cluster_id = v_cluster_num
    WHERE land_id = rec.land_id;

    UPDATE temp_land_clusters t
    SET cluster_id = v_cluster_num
    WHERE t.cluster_id = 0
    AND ST_DWithin(
      t.centroid::geography,
      rec.centroid::geography,
      p_max_distance_km * 1000
    );

    v_cluster_num := v_cluster_num + 1;
  END LOOP;

  RETURN QUERY
  SELECT 
    t.cluster_id,
    array_agg(t.land_id),
    jsonb_build_array(
      ST_XMin(ST_Extent(t.boundary)),
      ST_YMin(ST_Extent(t.boundary)),
      ST_XMax(ST_Extent(t.boundary)),
      ST_YMax(ST_Extent(t.boundary))
    ),
    (
      (ST_XMax(ST_Extent(t.boundary)) - ST_XMin(ST_Extent(t.boundary))) * 111.0 *
      (ST_YMax(ST_Extent(t.boundary)) - ST_YMin(ST_Extent(t.boundary))) * 111.0
    )::NUMERIC,
    COUNT(*)::INTEGER
  FROM temp_land_clusters t
  WHERE t.cluster_id > 0
  GROUP BY t.cluster_id
  HAVING (
    (ST_XMax(ST_Extent(t.boundary)) - ST_XMin(ST_Extent(t.boundary))) * 111.0 *
    (ST_YMax(ST_Extent(t.boundary)) - ST_YMin(ST_Extent(t.boundary))) * 111.0
  ) <= p_max_cluster_area_km2;
END;
$$;

-- API cost summary function
CREATE OR REPLACE FUNCTION public.get_tenant_api_costs(
  p_tenant_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_calls INTEGER,
  successful_calls INTEGER,
  failed_calls INTEGER,
  total_cost_usd NUMERIC,
  total_processing_units NUMERIC,
  total_data_mb NUMERIC,
  avg_response_time_ms NUMERIC,
  calls_by_type JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE success = true)::INTEGER,
    COUNT(*) FILTER (WHERE success = false)::INTEGER,
    COALESCE(SUM(cost_estimate), 0)::NUMERIC,
    COALESCE(SUM(processing_units), 0)::NUMERIC,
    COALESCE(SUM(data_size_mb), 0)::NUMERIC,
    COALESCE(AVG(response_time_ms), 0)::NUMERIC,
    jsonb_object_agg(
      api_type,
      jsonb_build_object(
        'count', COUNT(*),
        'cost', COALESCE(SUM(cost_estimate), 0)
      )
    )
  FROM public.copernicus_api_calls
  WHERE tenant_id = p_tenant_id
  AND created_at BETWEEN p_start_date AND p_end_date;
END;
$$;

ALTER TABLE public.land_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copernicus_api_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view their clusters"
  ON public.land_clusters FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Tenant admins can manage clusters"
  ON public.land_clusters FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND role IN ('tenant_owner', 'tenant_admin')
    )
  );

CREATE POLICY "Tenant users can view their API calls"
  ON public.copernicus_api_calls FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "System can insert API call logs"
  ON public.copernicus_api_calls FOR INSERT
  WITH CHECK (true);