
CREATE TABLE IF NOT EXISTS public.tenant_health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  score numeric(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tenant_health_snapshots_tenant_time
  ON public.tenant_health_snapshots (tenant_id, computed_at DESC);
ALTER TABLE public.tenant_health_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage health snapshots"
  ON public.tenant_health_snapshots FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE TABLE IF NOT EXISTS public.ai_model_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL,
  input_cost_per_1k numeric(10,6) NOT NULL DEFAULT 0,
  output_cost_per_1k numeric(10,6) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (model_name, effective_from)
);
ALTER TABLE public.ai_model_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage ai pricing"
  ON public.ai_model_pricing FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

INSERT INTO public.ai_model_pricing (model_name, input_cost_per_1k, output_cost_per_1k, notes) VALUES
  ('google/gemini-3-flash-preview', 0.000075, 0.0003, 'Lovable AI Gateway default'),
  ('google/gemini-2.5-flash', 0.000075, 0.0003, 'Lovable AI Gateway'),
  ('google/gemini-2.5-pro', 0.00125, 0.005, 'Lovable AI Gateway'),
  ('openai/gpt-5', 0.005, 0.015, 'Lovable AI Gateway'),
  ('openai/gpt-5-mini', 0.00015, 0.0006, 'Lovable AI Gateway'),
  ('openai/gpt-5-nano', 0.000075, 0.0003, 'Lovable AI Gateway')
ON CONFLICT (model_name, effective_from) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.impersonation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  target_tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (length(reason) >= 10),
  scope text NOT NULL DEFAULT 'read_only' CHECK (scope IN ('read_only','full')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  ip inet,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_admin
  ON public.impersonation_sessions (super_admin_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_target
  ON public.impersonation_sessions (target_tenant_id, started_at DESC);
ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage impersonation sessions"
  ON public.impersonation_sessions FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE OR REPLACE FUNCTION public.is_impersonating()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb -> 'act') IS NOT NULL,
    false
  );
$$;

CREATE TABLE IF NOT EXISTS public.backup_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('daily_pitr','manual_snapshot','restore','export')),
  status text NOT NULL CHECK (status IN ('running','succeeded','failed')),
  size_bytes bigint,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  triggered_by uuid,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_backup_events_started
  ON public.backup_events (started_at DESC);
ALTER TABLE public.backup_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage backup events"
  ON public.backup_events FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP TRIGGER IF EXISTS trg_ai_model_pricing_updated_at ON public.ai_model_pricing;
CREATE TRIGGER trg_ai_model_pricing_updated_at
BEFORE UPDATE ON public.ai_model_pricing
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
