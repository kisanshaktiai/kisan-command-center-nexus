-- M7: Hardening Recommendations + Cron automation

-- 1. Migration drafts table (drafts only — never auto-executed)
CREATE TABLE IF NOT EXISTS public.governance_migration_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  title text NOT NULL,
  rationale text,
  sql_draft text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warn','critical')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','applied','dismissed')),
  reviewer_id uuid,
  reviewer_notes text,
  reviewed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gmd_status ON public.governance_migration_drafts(status);
CREATE INDEX IF NOT EXISTS idx_gmd_category ON public.governance_migration_drafts(category);
CREATE INDEX IF NOT EXISTS idx_gmd_created ON public.governance_migration_drafts(created_at DESC);

ALTER TABLE public.governance_migration_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_select_gmd" ON public.governance_migration_drafts
  FOR SELECT TO authenticated USING (public.is_super_admin());
CREATE POLICY "super_admin_update_gmd" ON public.governance_migration_drafts
  FOR UPDATE TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "super_admin_insert_gmd" ON public.governance_migration_drafts
  FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());

CREATE TRIGGER trg_gmd_updated_at
  BEFORE UPDATE ON public.governance_migration_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Cron job registry
CREATE TABLE IF NOT EXISTS public.governance_cron_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL UNIQUE,
  schedule text NOT NULL,
  description text,
  last_run_at timestamptz,
  last_status text,
  last_error text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.governance_cron_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_select_gcj" ON public.governance_cron_jobs
  FOR SELECT TO authenticated USING (public.is_super_admin());
CREATE POLICY "super_admin_update_gcj" ON public.governance_cron_jobs
  FOR UPDATE TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE TRIGGER trg_gcj_updated_at
  BEFORE UPDATE ON public.governance_cron_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed registry rows
INSERT INTO public.governance_cron_jobs (job_name, schedule, description) VALUES
  ('governance-nightly-audit', '0 2 * * *', 'Runs the governance-audit edge function every night at 02:00 UTC.'),
  ('governance-weekly-hardening', '0 3 * * 0', 'Refreshes hardening recommendation drafts every Sunday at 03:00 UTC.')
ON CONFLICT (job_name) DO NOTHING;

-- 3. pg_cron schedule (nightly audit via pg_net to edge function)
DO $$
DECLARE
  v_url text := 'https://qfklkkzxemsbeniyugiz.supabase.co/functions/v1/governance-audit';
BEGIN
  -- Only schedule if pg_cron exists; ignore if duplicate
  PERFORM cron.unschedule('governance-nightly-audit') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'governance-nightly-audit'
  );
  PERFORM cron.schedule(
    'governance-nightly-audit',
    '0 2 * * *',
    format($cron$
      SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type','application/json'),
        body := '{}'::jsonb
      );
    $cron$, v_url)
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron schedule skipped: %', SQLERRM;
END $$;