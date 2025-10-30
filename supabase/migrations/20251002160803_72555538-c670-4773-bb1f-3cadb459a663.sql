-- ============================================
-- COMPREHENSIVE NDVI SYSTEM OVERHAUL - FIXED
-- World-class satellite data processing
-- ============================================

-- Step 1: Drop dependent views first
DROP VIEW IF EXISTS public.latest_satellite_tiles CASCADE;

-- Step 2: Fix tile_id length issue (CRITICAL)
ALTER TABLE public.satellite_tiles 
  ALTER COLUMN tile_id TYPE VARCHAR(100);

-- Step 3: Recreate the view with proper schema
CREATE OR REPLACE VIEW public.latest_satellite_tiles AS
SELECT DISTINCT ON (tile_id)
  *
FROM public.satellite_tiles
ORDER BY tile_id, acquisition_date DESC, created_at DESC;

-- Step 4: Add proper NDVI processing fields
ALTER TABLE public.satellite_tiles
  ADD COLUMN IF NOT EXISTS ndvi_statistics JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vegetation_health_score NUMERIC(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vegetation_coverage_percent NUMERIC(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ndvi_min NUMERIC(5,3) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ndvi_max NUMERIC(5,3) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ndvi_mean NUMERIC(5,3) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ndvi_std_dev NUMERIC(5,3) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS processing_method VARCHAR(50) DEFAULT 'cog_streaming',
  ADD COLUMN IF NOT EXISTS band_data_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ndvi_calculation_timestamp TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pixel_count INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS valid_pixel_count INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS data_completeness_percent NUMERIC(5,2) DEFAULT NULL;

-- Step 5: Create NDVI processing log table
CREATE TABLE IF NOT EXISTS public.ndvi_processing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  satellite_tile_id UUID NOT NULL REFERENCES public.satellite_tiles(id) ON DELETE CASCADE,
  processing_step VARCHAR(100) NOT NULL,
  step_status VARCHAR(50) NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ DEFAULT NULL,
  duration_ms INTEGER DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  error_details JSONB DEFAULT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ndvi_logs_tile ON public.ndvi_processing_logs(satellite_tile_id);
CREATE INDEX IF NOT EXISTS idx_ndvi_logs_status ON public.ndvi_processing_logs(step_status);
CREATE INDEX IF NOT EXISTS idx_ndvi_logs_created ON public.ndvi_processing_logs(created_at DESC);

-- Step 6: Create NDVI spatial analytics table
CREATE TABLE IF NOT EXISTS public.ndvi_spatial_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  satellite_tile_id UUID NOT NULL REFERENCES public.satellite_tiles(id) ON DELETE CASCADE,
  region_name VARCHAR(100) NOT NULL,
  bbox JSONB NOT NULL,
  ndvi_histogram JSONB DEFAULT NULL,
  vegetation_zones JSONB DEFAULT NULL,
  temporal_comparison JSONB DEFAULT NULL,
  anomaly_detection JSONB DEFAULT NULL,
  quality_flags JSONB DEFAULT '{}',
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ndvi_spatial_tile ON public.ndvi_spatial_analytics(satellite_tile_id);
CREATE INDEX IF NOT EXISTS idx_ndvi_spatial_region ON public.ndvi_spatial_analytics(region_name);
CREATE INDEX IF NOT EXISTS idx_ndvi_spatial_processed ON public.ndvi_spatial_analytics(processed_at DESC);

-- Step 7: Create SAS token cache table for efficient API access
CREATE TABLE IF NOT EXISTS public.sas_token_cache (
  id VARCHAR(50) PRIMARY KEY,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  provider VARCHAR(50) DEFAULT 'planetary_computer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 8: Add indices for performance
CREATE INDEX IF NOT EXISTS idx_satellite_tiles_health_score 
  ON public.satellite_tiles(vegetation_health_score DESC) 
  WHERE vegetation_health_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_satellite_tiles_ndvi_stats 
  ON public.satellite_tiles(ndvi_mean DESC, ndvi_std_dev) 
  WHERE ndvi_mean IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_satellite_tiles_processing_method 
  ON public.satellite_tiles(processing_method, status);

-- Step 9: Add RLS policies for new tables
ALTER TABLE public.ndvi_processing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ndvi_spatial_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sas_token_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view NDVI processing logs"
  ON public.ndvi_processing_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid() AND is_active = true));

CREATE POLICY "Admins can manage NDVI spatial analytics"
  ON public.ndvi_spatial_analytics FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid() AND is_active = true));

CREATE POLICY "System can manage SAS token cache"
  ON public.sas_token_cache FOR ALL
  USING (true) WITH CHECK (true);

-- Step 10: Create helper function for NDVI classification
CREATE OR REPLACE FUNCTION public.classify_ndvi_value(ndvi_value NUMERIC)
RETURNS TEXT AS $$
BEGIN
  IF ndvi_value IS NULL OR ndvi_value < -1 OR ndvi_value > 1 THEN RETURN 'invalid';
  ELSIF ndvi_value < -0.1 THEN RETURN 'water';
  ELSIF ndvi_value < 0.1 THEN RETURN 'bare_soil';
  ELSIF ndvi_value < 0.3 THEN RETURN 'sparse_vegetation';
  ELSIF ndvi_value < 0.5 THEN RETURN 'moderate_vegetation';
  ELSIF ndvi_value < 0.7 THEN RETURN 'dense_vegetation';
  ELSE RETURN 'very_dense_vegetation';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 11: Create function to calculate vegetation health score
CREATE OR REPLACE FUNCTION public.calculate_vegetation_health_score(
  p_ndvi_mean NUMERIC, p_ndvi_std_dev NUMERIC, 
  p_vegetation_coverage NUMERIC, p_data_completeness NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  health_score NUMERIC := 0;
BEGIN
  IF p_ndvi_mean IS NOT NULL THEN
    health_score := health_score + LEAST(40, (p_ndvi_mean + 1) * 20);
  END IF;
  IF p_ndvi_std_dev IS NOT NULL THEN
    health_score := health_score + GREATEST(0, 20 - (p_ndvi_std_dev * 40));
  END IF;
  IF p_vegetation_coverage IS NOT NULL THEN
    health_score := health_score + (p_vegetation_coverage * 0.25);
  END IF;
  IF p_data_completeness IS NOT NULL THEN
    health_score := health_score + (p_data_completeness * 0.15);
  END IF;
  RETURN ROUND(LEAST(100, GREATEST(0, health_score)), 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 12: Create trigger to auto-calculate health score
CREATE OR REPLACE FUNCTION public.update_vegetation_health_score()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ndvi_mean IS NOT NULL THEN
    NEW.vegetation_health_score := public.calculate_vegetation_health_score(
      NEW.ndvi_mean, NEW.ndvi_std_dev, NEW.vegetation_coverage_percent, NEW.data_completeness_percent
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_vegetation_health ON public.satellite_tiles;
CREATE TRIGGER trigger_update_vegetation_health
  BEFORE INSERT OR UPDATE OF ndvi_mean, ndvi_std_dev, vegetation_coverage_percent, data_completeness_percent
  ON public.satellite_tiles FOR EACH ROW
  EXECUTE FUNCTION public.update_vegetation_health_score();

-- Step 13: Update existing tiles
UPDATE public.satellite_tiles
SET status = CASE 
    WHEN status = 'completed' AND ndvi_path IS NULL THEN 'metadata_only'
    WHEN status = 'completed' AND ndvi_mean IS NULL THEN 'needs_processing'
    ELSE status END,
  processing_method = COALESCE(processing_method, 'not_yet_processed')
WHERE status IN ('completed', 'ready', 'metadata_only');