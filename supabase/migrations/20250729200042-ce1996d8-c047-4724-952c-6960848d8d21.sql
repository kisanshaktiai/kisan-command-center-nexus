-- Seed data for testing the newly created infrastructure tables
-- CRITICAL: Adding minimal test data only

-- Insert sample feature flags
INSERT INTO public.feature_flags (flag_name, description, is_enabled, rollout_percentage, target_tenants) VALUES
('ai_recommendations_v2', 'Enhanced AI crop recommendations with weather integration', true, 75, '{}'),
('marketplace_beta', 'Beta version of the farmer marketplace', false, 25, '{}'),
('advanced_analytics', 'Advanced analytics dashboard features', true, 100, '{}'),
('mobile_app_v3', 'New mobile application features', false, 0, '{}');

-- Insert sample system health metrics (for demonstration)
INSERT INTO public.system_health_metrics (tenant_id, metric_type, metric_name, value, unit, labels) VALUES
(NULL, 'system', 'cpu_usage', 45.2, 'percent', '{"server": "web-01"}'),
(NULL, 'system', 'memory_usage', 67.8, 'percent', '{"server": "web-01"}'),
(NULL, 'system', 'disk_usage', 32.1, 'percent', '{"server": "web-01"}'),
(NULL, 'database', 'active_connections', 15, 'count', '{"database": "main"}');

-- Insert sample resource utilization data
INSERT INTO public.resource_utilization (tenant_id, resource_type, current_usage, max_limit, period_start, period_end, metadata) VALUES
(NULL, 'api_calls', 8500, 10000, now() - interval '1 hour', now(), '{"endpoint": "farmers"}'),
(NULL, 'storage', 450, 1000, now() - interval '1 hour', now(), '{"type": "file_storage"}'),
(NULL, 'cpu', 2.5, 4, now() - interval '1 hour', now(), '{"cores": 4}'),
(NULL, 'memory', 6.2, 8, now() - interval '1 hour', now(), '{"unit": "GB"}');

-- Insert sample financial analytics data
INSERT INTO public.financial_analytics (tenant_id, metric_type, amount, currency, period_type, period_start, period_end, breakdown) VALUES
(NULL, 'revenue', 125000, 'USD', 'monthly', date_trunc('month', now()), date_trunc('month', now()) + interval '1 month' - interval '1 day', '{"subscriptions": 100000, "usage": 25000}'),
(NULL, 'mrr', 95000, 'USD', 'monthly', date_trunc('month', now()), date_trunc('month', now()) + interval '1 month' - interval '1 day', '{"new": 15000, "expansion": 5000, "churn": -3000}'),
(NULL, 'churn', 3.2, 'USD', 'monthly', date_trunc('month', now()), date_trunc('month', now()) + interval '1 month' - interval '1 day', '{"voluntary": 2.1, "involuntary": 1.1}');