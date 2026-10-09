-- ============================================================================
-- REPO: kisanshaktiai/kisan-command-center-nexus   (admin panel / control plane)
-- PATH: supabase/migrations/20260921120100_rag_golden_set.sql
--
-- RAG Phase 0 — golden set v1 and nightly retrieval metrics (design v2 §3.6,
-- §4.1, §5 Phase 0).
--
-- The golden set is part of the registry the admin panel governs: real farmer
-- questions mapped to the documents and chunks that answer them. The nightly
-- evaluation (farmer app, edge function `rag-eval`) reads the questions,
-- runs the SAME retrieval path General chat uses, and writes one row per run
-- here. Rollout of `rag_general_chat` stays targeted until these metrics pass.
--
-- Both tables are admin-only to read (same predicate as rag_retrieval_logs)
-- and written with the service role. No farmer identity is stored: a question
-- keeps only the id of the message it came from, never who asked it.
--
-- Idempotent; every statement stands alone.
-- ============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. rag_golden_questions — one row per question, with its expected answers.
--    expected_document_ids is the document-level truth (recall@10, MRR, nDCG
--    are computed against it); expected_chunk_ids is optional, finer truth for
--    questions where the exact passage matters (identifier questions above all).
--    identifiers marks the identifier slice: questions that name a variety,
--    product, scheme or chemical, reported as their own recall figure.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rag_golden_questions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text         text NOT NULL CHECK (length(btrim(question_text)) >= 2),
  language              character varying NOT NULL,
  origin                text NOT NULL DEFAULT 'farmer' CHECK (origin IN ('farmer', 'curated')),
  source_message_id     uuid,
  expected_document_ids uuid[] NOT NULL DEFAULT '{}',
  expected_chunk_ids    uuid[] NOT NULL DEFAULT '{}',
  identifiers           text[] NOT NULL DEFAULT '{}',
  crop_codes            text[],
  state_codes           text[],
  topic_codes           text[],
  notes                 text,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.rag_golden_questions IS
  'Golden set for RAG retrieval: real (origin=farmer) or curated questions with the documents/chunks expected to answer them. Read by the nightly rag-eval run.';

COMMENT ON COLUMN public.rag_golden_questions.expected_document_ids IS
  'Documents that answer the question. Empty means the corpus is expected to have NO answer (the run then scores whether retrieval correctly returned no evidence).';

CREATE INDEX IF NOT EXISTS idx_rag_golden_questions_active ON public.rag_golden_questions (is_active) WHERE is_active;

ALTER TABLE public.rag_golden_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view rag golden questions" ON public.rag_golden_questions;

CREATE POLICY "Admins can view rag golden questions" ON public.rag_golden_questions
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid() AND admin_users.is_active = true));
-- writes: service role only (rag-admin / migrations)


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. rag_eval_runs — one row per nightly (or manual) evaluation.
--    per_question keeps each question's ranked document list and hit ranks so
--    a regression can be traced to the questions that moved, not only to an
--    aggregate.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rag_eval_runs (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at                timestamptz NOT NULL DEFAULT now(),
  finished_at               timestamptz,
  status                    text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  trigger                   text NOT NULL DEFAULT 'nightly' CHECK (trigger IN ('nightly', 'manual')),
  retrieval_config          jsonb NOT NULL DEFAULT '{}'::jsonb,
  questions_total           integer NOT NULL DEFAULT 0,
  questions_evaluated       integer NOT NULL DEFAULT 0,
  recall_at_10              numeric(5,4),
  mrr                       numeric(5,4),
  ndcg_at_10                numeric(5,4),
  identifier_recall_at_10   numeric(5,4),
  identifier_questions      integer NOT NULL DEFAULT 0,
  no_answer_correct_rate    numeric(5,4),
  no_answer_questions       integer NOT NULL DEFAULT 0,
  no_evidence_rate          numeric(5,4),
  error_rate                numeric(5,4),
  p50_latency_ms            integer,
  p95_latency_ms            integer,
  per_question              jsonb NOT NULL DEFAULT '[]'::jsonb,
  error                     text
);

COMMENT ON TABLE public.rag_eval_runs IS
  'Nightly retrieval metrics over rag_golden_questions: recall@10, MRR, nDCG@10 at document level, identifier-slice recall, and the share of no-answer questions correctly returning no evidence.';

CREATE INDEX IF NOT EXISTS idx_rag_eval_runs_started ON public.rag_eval_runs (started_at DESC);

ALTER TABLE public.rag_eval_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view rag eval runs" ON public.rag_eval_runs;

CREATE POLICY "Admins can view rag eval runs" ON public.rag_eval_runs
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid() AND admin_users.is_active = true));
-- writes: service role only (rag-eval)
