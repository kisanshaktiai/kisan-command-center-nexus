-- Weekly NDVI Auto-Sync Setup
-- This migration sets up pg_cron to automatically trigger NDVI sync every Monday at 2 AM UTC

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create storage bucket for NDVI tiles if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('ndvi-tiles', 'ndvi-tiles', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for ndvi-tiles bucket
CREATE POLICY "Public read access for NDVI tiles"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ndvi-tiles');

CREATE POLICY "Authenticated users can upload NDVI tiles"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ndvi-tiles');

CREATE POLICY "Service role can manage NDVI tiles"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'ndvi-tiles');

-- Schedule weekly NDVI sync (every Monday at 2 AM UTC)
-- This will call the weekly-ndvi-sync edge function
SELECT cron.schedule(
  'weekly-ndvi-auto-sync',
  '0 2 * * 1', -- Every Monday at 2 AM UTC
  $$
  SELECT
    net.http_post(
        url:='https://qfklkkzxemsbeniyugiz.supabase.co/functions/v1/weekly-ndvi-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFma2xra3p4ZW1zYmVuaXl1Z2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MjcxNjUsImV4cCI6MjA2ODAwMzE2NX0.dUnGp7wbwYom1FPbn_4EGf3PWjgmr8mXwL2w2SdYOh4"}'::jsonb,
        body:=concat('{"trigger": "cron", "timestamp": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Add index for faster status queries
CREATE INDEX IF NOT EXISTS idx_satellite_tiles_status ON satellite_tiles(status);
CREATE INDEX IF NOT EXISTS idx_satellite_tiles_acquisition_date ON satellite_tiles(acquisition_date DESC);
CREATE INDEX IF NOT EXISTS idx_satellite_tiles_tile_id ON satellite_tiles(tile_id);

-- Add comment explaining the cron job
COMMENT ON EXTENSION pg_cron IS 'Used for scheduling weekly NDVI data synchronization every Monday at 2 AM UTC';
