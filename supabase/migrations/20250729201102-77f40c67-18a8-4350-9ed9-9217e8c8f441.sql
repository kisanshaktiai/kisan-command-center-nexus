-- Function to clean up old metrics data
CREATE OR REPLACE FUNCTION public.cleanup_old_metrics(
  table_name text,
  keep_count integer DEFAULT 1000
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
  cleanup_query TEXT;
BEGIN
  -- Validate table name to prevent SQL injection
  IF table_name NOT IN ('system_health_metrics', 'resource_utilization', 'financial_analytics') THEN
    RAISE EXCEPTION 'Invalid table name: %', table_name;
  END IF;
  
  -- Build and execute cleanup query
  cleanup_query := format(
    'WITH old_records AS (
      SELECT id FROM %I 
      ORDER BY timestamp DESC 
      OFFSET %s
    )
    DELETE FROM %I 
    WHERE id IN (SELECT id FROM old_records)',
    table_name, keep_count, table_name
  );
  
  EXECUTE cleanup_query;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Create scheduled jobs for metrics collection (requires pg_cron extension)
-- Collect system metrics every 5 minutes
SELECT cron.schedule(
  'collect-system-metrics',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://qfklkkzxemsbeniyugiz.supabase.co/functions/v1/collect-system-metrics',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFma2xra3p4ZW1zYmVuaXl1Z2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MjcxNjUsImV4cCI6MjA2ODAwMzE2NX0.dUnGp7wbwYom1FPbn_4EGf3PWjgmr8mXwL2w2SdYOh4"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Collect resource metrics every 10 minutes
SELECT cron.schedule(
  'collect-resource-metrics',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://qfklkkzxemsbeniyugiz.supabase.co/functions/v1/collect-resource-metrics',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFma2xra3p4ZW1zYmVuaXl1Z2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MjcxNjUsImV4cCI6MjA2ODAwMzE2NX0.dUnGp7wbwYom1FPbn_4EGf3PWjgmr8mXwL2w2SdYOh4"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Collect financial metrics daily at 6 AM
SELECT cron.schedule(
  'collect-financial-metrics',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://qfklkkzxemsbeniyugiz.supabase.co/functions/v1/collect-financial-metrics',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFma2xra3p4ZW1zYmVuaXl1Z2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MjcxNjUsImV4cCI6MjA2ODAwMzE2NX0.dUnGp7wbwYom1FPbn_4EGf3PWjgmr8mXwL2w2SdYOh4"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Enable real-time for monitoring tables
ALTER TABLE public.system_health_metrics REPLICA IDENTITY FULL;
ALTER TABLE public.resource_utilization REPLICA IDENTITY FULL;
ALTER TABLE public.financial_analytics REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_health_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.resource_utilization;
ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_analytics;