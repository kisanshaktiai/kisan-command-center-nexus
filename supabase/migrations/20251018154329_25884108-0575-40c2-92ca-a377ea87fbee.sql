-- =====================================================
-- Migration: Auto-mark agricultural tiles on land insert + Cron setup
-- =====================================================

-- 1. Create function to mark tiles when land is inserted/updated
CREATE OR REPLACE FUNCTION public.auto_mark_agricultural_tiles_on_land_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tile_record RECORD;
  v_land_area_km2 NUMERIC;
BEGIN
  -- Only process if boundary exists
  IF NEW.boundary IS NOT NULL THEN
    -- Calculate land area in km²
    SELECT calculate_area_km2(NEW.boundary) INTO v_land_area_km2;
    
    -- Find intersecting MGRS tiles
    FOR v_tile_record IN 
      SELECT id, tile_id, geometry
      FROM mgrs_tiles
      WHERE ST_Intersects(geometry, NEW.boundary)
    LOOP
      -- Mark each intersecting tile
      PERFORM mark_agricultural_tile(v_tile_record.tile_id, v_land_area_km2);
      
      RAISE NOTICE 'Auto-marked tile % for land %', v_tile_record.tile_id, NEW.id;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Create trigger on lands table
DROP TRIGGER IF EXISTS trigger_auto_mark_agricultural_tiles ON public.lands;
CREATE TRIGGER trigger_auto_mark_agricultural_tiles
  AFTER INSERT OR UPDATE OF boundary
  ON public.lands
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_mark_agricultural_tiles_on_land_change();

-- 3. Create tile marking progress tracking table
CREATE TABLE IF NOT EXISTS public.tile_marking_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id TEXT UNIQUE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  total_lands INTEGER DEFAULT 0,
  processed_lands INTEGER DEFAULT 0,
  marked_tiles_count INTEGER DEFAULT 0,
  current_land_id UUID,
  current_step TEXT,
  errors JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on progress table
ALTER TABLE public.tile_marking_progress ENABLE ROW LEVEL SECURITY;

-- Allow super admins to view progress
CREATE POLICY "Super admins can view tile marking progress"
  ON public.tile_marking_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
        AND role = 'super_admin'
        AND is_active = true
    )
  );

-- Allow system to insert/update progress
CREATE POLICY "System can manage tile marking progress"
  ON public.tile_marking_progress
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Enable pg_cron extension (required for scheduled jobs)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 5. Schedule the mark-agricultural-tiles function to run every 5 minutes
SELECT cron.schedule(
  'mark-agricultural-tiles-every-5min',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://qfklkkzxemsbeniyugiz.supabase.co/functions/v1/mark-agricultural-tiles',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFma2xra3p4ZW1zYmVuaXl1Z2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MjcxNjUsImV4cCI6MjA2ODAwMzE2NX0.dUnGp7wbwYom1FPbn_4EGf3PWjgmr8mXwL2w2SdYOh4"}'::JSONB,
    body := '{"source": "cron"}'::JSONB
  ) AS request_id;
  $$
);

-- 6. Create index on tile_marking_progress for performance
CREATE INDEX IF NOT EXISTS idx_tile_marking_progress_execution_id 
  ON public.tile_marking_progress(execution_id);

CREATE INDEX IF NOT EXISTS idx_tile_marking_progress_status 
  ON public.tile_marking_progress(status, started_at DESC);

-- 7. Add updated_at trigger for tile_marking_progress
CREATE TRIGGER update_tile_marking_progress_updated_at
  BEFORE UPDATE ON public.tile_marking_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.tile_marking_progress IS 'Tracks progress of agricultural tile marking operations';
COMMENT ON FUNCTION public.auto_mark_agricultural_tiles_on_land_change() IS 'Automatically marks MGRS tiles as agricultural when land records are inserted or updated';