-- Enable realtime for monitoring tables
ALTER TABLE system_health_metrics REPLICA IDENTITY FULL;
ALTER TABLE resource_utilization REPLICA IDENTITY FULL;
ALTER TABLE api_logs REPLICA IDENTITY FULL;
ALTER TABLE financial_analytics REPLICA IDENTITY FULL;

-- Create publication for realtime if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END$$;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE system_health_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE resource_utilization;
ALTER PUBLICATION supabase_realtime ADD TABLE api_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE financial_analytics;