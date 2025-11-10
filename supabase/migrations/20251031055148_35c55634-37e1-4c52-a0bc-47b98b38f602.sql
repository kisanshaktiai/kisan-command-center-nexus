-- Enable realtime for billing tables (only if not already enabled)
DO $$ 
BEGIN
  ALTER TABLE tenant_subscriptions REPLICA IDENTITY FULL;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE invoices REPLICA IDENTITY FULL;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE payment_records REPLICA IDENTITY FULL;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE tenant_wallets REPLICA IDENTITY FULL;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE wallet_transactions REPLICA IDENTITY FULL;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE billing_analytics REPLICA IDENTITY FULL;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE billing_automation_rules REPLICA IDENTITY FULL;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE billing_notifications REPLICA IDENTITY FULL;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE currency_rates REPLICA IDENTITY FULL;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE tax_configurations REPLICA IDENTITY FULL;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Create indexes for better real-time query performance
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant_status ON tenant_subscriptions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_records_tenant_status ON payment_records(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status ON invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_created ON wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_analytics_date ON billing_analytics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_billing_automation_active ON billing_automation_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_billing_notifications_status ON billing_notifications(status, created_at DESC);

-- Create function to auto-update billing analytics
CREATE OR REPLACE FUNCTION update_billing_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate metrics when payment records change
  INSERT INTO billing_analytics (
    metric_date,
    mrr,
    arr,
    churn_rate,
    ltv,
    payment_success_rate,
    average_revenue_per_user
  )
  VALUES (
    CURRENT_DATE,
    COALESCE((SELECT SUM(amount) FROM payment_records WHERE status = 'completed' AND created_at >= date_trunc('month', CURRENT_DATE)), 0),
    COALESCE((SELECT SUM(amount) * 12 FROM payment_records WHERE status = 'completed' AND created_at >= date_trunc('year', CURRENT_DATE)), 0),
    0, -- Churn rate calculation would need subscription cancellation tracking
    COALESCE((SELECT AVG(total) FROM (SELECT SUM(amount) as total FROM payment_records WHERE status = 'completed' GROUP BY tenant_id) sub), 0),
    COALESCE((SELECT (COUNT(*) FILTER (WHERE status = 'completed')::float / NULLIF(COUNT(*), 0)) * 100 FROM payment_records WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'), 0),
    COALESCE((SELECT AVG(amount) FROM payment_records WHERE status = 'completed' AND created_at >= CURRENT_DATE - INTERVAL '30 days'), 0)
  )
  ON CONFLICT (metric_date) DO UPDATE SET
    mrr = EXCLUDED.mrr,
    arr = EXCLUDED.arr,
    payment_success_rate = EXCLUDED.payment_success_rate,
    average_revenue_per_user = EXCLUDED.average_revenue_per_user,
    updated_at = now();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for analytics updates
DROP TRIGGER IF EXISTS trigger_update_billing_analytics ON payment_records;
CREATE TRIGGER trigger_update_billing_analytics
  AFTER INSERT OR UPDATE ON payment_records
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_analytics();

COMMENT ON FUNCTION update_billing_analytics() IS 'Automatically updates billing analytics when payment records change';
