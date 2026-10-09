
CREATE TABLE IF NOT EXISTS public.governance_audit_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  summary text,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_issues integer NOT NULL DEFAULT 0,
  generated_by uuid,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gar_type_time ON public.governance_audit_reports (report_type, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_gar_severity ON public.governance_audit_reports (severity);

ALTER TABLE public.governance_audit_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view governance reports"
  ON public.governance_audit_reports FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Super admins can insert governance reports"
  ON public.governance_audit_reports FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can delete governance reports"
  ON public.governance_audit_reports FOR DELETE
  TO authenticated
  USING (public.is_super_admin());
