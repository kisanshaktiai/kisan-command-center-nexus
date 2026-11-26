-- ============================================================================
-- REPO: kisanshaktiai/kisan-command-center-nexus   (admin panel / control plane)
-- PATH: supabase/migrations/20261126150000_rag_pages.sql
--
-- RAG OCR — page-level extraction state (design v2 §4.2: rag_pages).
--
-- Why a table is needed: a scanned document is read page by page by an
-- external OCR engine, in batches spread over several edge-function requests
-- (one request cannot hold a long scan: 2 s CPU, 150 s wall clock). Between
-- requests something has to remember which pages are read, which are queued,
-- which failed and how often they were tried — otherwise a retry re-reads
-- (and re-pays for) every page, and two requests can read the same page.
-- rag_documents has one row per document and rag_chunks only exists after
-- chunking, so neither can hold this.
--
-- Nothing else changes: rag_documents and rag_chunks keep their columns
-- (per-chunk extraction method / confidence go in the existing
-- rag_chunks.entity_meta jsonb), processing_status keeps its six values, and
-- the search RPCs are untouched — OCR text is searched as ordinary chunks.
--
-- Tenancy and access: every row carries the document's tenant_id. Row level
-- security is on; platform admins may read (same predicate as
-- rag_retrieval_logs); no policy grants anon or authenticated farmers
-- anything, so page text is reachable only through rag_chunks under its
-- existing policies. Writes are service-role only (rag-ingest).
--
-- Idempotent; every statement stands alone.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rag_pages (
  document_id        uuid        NOT NULL REFERENCES public.rag_documents(id) ON DELETE CASCADE,
  page_number        integer     NOT NULL CHECK (page_number >= 1),
  tenant_id          uuid,
  status             text        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'processing', 'done', 'empty', 'low_confidence', 'failed')),
  extraction_method  text        CHECK (extraction_method IN ('text', 'ocr')),
  page_text          text,
  char_count         integer     NOT NULL DEFAULT 0,
  ocr_confidence     numeric(5,4) CHECK (ocr_confidence IS NULL OR (ocr_confidence >= 0 AND ocr_confidence <= 1)),
  ocr_min_confidence numeric(5,4) CHECK (ocr_min_confidence IS NULL OR (ocr_min_confidence >= 0 AND ocr_min_confidence <= 1)),
  ocr_engine         text,
  attempts           integer     NOT NULL DEFAULT 0,
  error              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (document_id, page_number)
);

COMMENT ON TABLE public.rag_pages IS
  'One row per page of a RAG document whose extraction needed OCR: how the page text was obtained (native text layer or OCR), the engine and its reported confidence, and the retry state. Written by rag-ingest; rag_chunks remains the only searched table.';

COMMENT ON COLUMN public.rag_pages.ocr_confidence IS
  'Average page confidence as reported by the OCR engine (0–1). NULL when the page came from the native text layer or the engine reported none — never estimated.';

CREATE INDEX IF NOT EXISTS idx_rag_pages_queue ON public.rag_pages (document_id, page_number) WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_rag_pages_tenant ON public.rag_pages (tenant_id) WHERE tenant_id IS NOT NULL;

ALTER TABLE public.rag_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view rag pages" ON public.rag_pages;

CREATE POLICY "Admins can view rag pages" ON public.rag_pages
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid() AND admin_users.is_active = true));

REVOKE ALL ON TABLE public.rag_pages FROM anon;
