
-- M6: Hallucination detection logs for narration validation
CREATE TABLE IF NOT EXISTS public.hallucination_detection_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL,
  source_id uuid,
  tenant_id uuid,
  farmer_id uuid,
  ai_content text NOT NULL,
  rules_applied jsonb NOT NULL DEFAULT '[]'::jsonb,
  flagged_terms jsonb NOT NULL DEFAULT '[]'::jsonb,
  hallucination_score numeric NOT NULL DEFAULT 0,
  verdict text NOT NULL DEFAULT 'pending',
  judge_model text,
  judge_reasoning text,
  reviewer_id uuid,
  reviewer_notes text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT halluc_verdict_chk CHECK (verdict IN ('pending','clean','suspect','hallucinated','dismissed'))
);

CREATE INDEX IF NOT EXISTS idx_halluc_verdict ON public.hallucination_detection_logs(verdict);
CREATE INDEX IF NOT EXISTS idx_halluc_created ON public.hallucination_detection_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_halluc_score ON public.hallucination_detection_logs(hallucination_score DESC);

ALTER TABLE public.hallucination_detection_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "halluc_super_admin_select" ON public.hallucination_detection_logs;
CREATE POLICY "halluc_super_admin_select" ON public.hallucination_detection_logs
  FOR SELECT TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS "halluc_super_admin_update" ON public.hallucination_detection_logs;
CREATE POLICY "halluc_super_admin_update" ON public.hallucination_detection_logs
  FOR UPDATE TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Service-role inserts only (edge functions); no insert policy for normal users.

CREATE TRIGGER trg_halluc_updated_at
  BEFORE UPDATE ON public.hallucination_detection_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
