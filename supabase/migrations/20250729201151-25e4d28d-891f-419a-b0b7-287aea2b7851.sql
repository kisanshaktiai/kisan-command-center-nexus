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

-- Enable real-time for monitoring tables
ALTER TABLE public.system_health_metrics REPLICA IDENTITY FULL;
ALTER TABLE public.resource_utilization REPLICA IDENTITY FULL;
ALTER TABLE public.financial_analytics REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_health_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.resource_utilization;
ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_analytics;