
-- Check the actual schema of the metrics tables to identify column names
SELECT table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('financial_analytics', 'system_health_metrics', 'resource_utilization')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Also check if there are any missing columns that need to be added
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_name = 'financial_analytics' 
AND table_schema = 'public';

SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_name = 'system_health_metrics' 
AND table_schema = 'public';

SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_name = 'resource_utilization' 
AND table_schema = 'public';
