-- ============================================================================
-- REPO: kisanshaktiai/kisan-command-center-nexus   (admin panel / control plane)
-- PATH: supabase/migrations/20260921120300_rag_retrieval_logs_outcomes.sql
--
-- RAG Phase 0 — admit the two new retrieval outcomes in rag_retrieval_logs.
--
-- Found by running the merged retriever against a replica of the live schema
-- (2026-09-21): rag_retrieval_logs carries two CHECK constraints that no
-- migration in either repository ever defined —
--   rag_retrieval_logs_retrieval_mode_check   retrieval_mode IN ('vector','fulltext','hybrid')
--   rag_retrieval_logs_purpose_check          retrieval_purpose IS NULL OR IN (GENERAL_CHAT, SCHEDULE_*)
-- Phase 0 logs a failed retrieval with retrieval_mode = 'error' (design §4.3,
-- S1) and the nightly golden-set run with retrieval_purpose = 'GOLDEN_EVAL'.
-- Both inserts violate the live constraints, and because supabase-js returns
-- the error instead of throwing, every such row would have been dropped
-- silently: the S1 error trail and the eval log would never exist.
--
-- The constraints live on the partitioned parent (conislocal = true, verified
-- live) and are inherited by the monthly partitions, so replacing them on the
-- parent replaces them everywhere. They are located by what they constrain,
-- not by name, so the migration holds if the live names differ from the
-- names above.
--
-- Idempotent; every statement stands alone.
-- ============================================================================

-- 1. Drop every CHECK on the parent that constrains either column.
DO $drop$
DECLARE v_name text;
BEGIN
  FOR v_name IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.rag_retrieval_logs'::regclass AND contype = 'c' AND conislocal
      AND (pg_get_constraintdef(oid) ILIKE '%retrieval_mode%' OR pg_get_constraintdef(oid) ILIKE '%retrieval_purpose%')
  LOOP
    EXECUTE format('ALTER TABLE public.rag_retrieval_logs DROP CONSTRAINT %I', v_name);
  END LOOP;
END
$drop$;

-- 2. Re-add them with the Phase 0 outcomes admitted.
ALTER TABLE public.rag_retrieval_logs
  ADD CONSTRAINT rag_retrieval_logs_retrieval_mode_check
  CHECK (retrieval_mode = ANY (ARRAY['vector'::text, 'fulltext'::text, 'hybrid'::text, 'error'::text]));

ALTER TABLE public.rag_retrieval_logs
  ADD CONSTRAINT rag_retrieval_logs_purpose_check
  CHECK (retrieval_purpose IS NULL OR retrieval_purpose = ANY (ARRAY[
    'GENERAL_CHAT'::text, 'SCHEDULE_DOCUMENT_SELECTION'::text, 'SCHEDULE_EXTRACTION'::text,
    'SCHEDULE_VALIDATION'::text, 'GOLDEN_EVAL'::text]));

-- 3. Assert on the parent and on every partition: no CHECK on either column
--    remains that would reject the outcomes Phase 0 writes.
DO $assert$
DECLARE v_bad text;
BEGIN
  SELECT string_agg(c.conrelid::regclass::text || '.' || c.conname, ', ') INTO v_bad
  FROM pg_constraint c
  WHERE c.contype = 'c'
    AND (c.conrelid = 'public.rag_retrieval_logs'::regclass
         OR c.conrelid IN (SELECT inhrelid FROM pg_inherits WHERE inhparent = 'public.rag_retrieval_logs'::regclass))
    AND (
      (pg_get_constraintdef(c.oid) ILIKE '%retrieval_mode%'    AND pg_get_constraintdef(c.oid) NOT LIKE '%''error''%')
      OR
      (pg_get_constraintdef(c.oid) ILIKE '%retrieval_purpose%' AND pg_get_constraintdef(c.oid) NOT LIKE '%''GOLDEN_EVAL''%')
    );
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'rag_retrieval_logs still rejects Phase 0 outcomes: %', v_bad;
  END IF;
END
$assert$;
