-- ============================================================================
-- REPO: kisanshaktiai/kisan-command-center-nexus   (admin panel / control plane)
-- PATH: supabase/migrations/20260921120000_rag_phase0_retrieval.sql
--
-- RAG Phase 0 — retrieval logic and safety, database side.
--
-- This migration owns the pieces of Phase 0 that live in the database. The
-- admin panel is the plane that authors the search RPCs (the live 7-argument
-- definitions were created by 20260826124317_rag_topics_taxonomy.sql), so the
-- corrections to them belong here and not in the farmer app.
--
-- What it does, and why:
--
--  1. S3 — EXECUTE privileges on the search RPCs.
--     20260808120000_rag_search_functions.sql (farmer repo) ended with
--     REVOKE ALL ... FROM anon against the SIX-argument signatures. The
--     taxonomy migration then DROPped those functions and CREATEd new
--     SEVEN-argument ones carrying p_topics. DROP FUNCTION destroys the
--     function's ACL with it, and a freshly created function takes the
--     PostgreSQL default of EXECUTE TO PUBLIC. Verified live 2026-09-21,
--     proacl on both functions is
--       {=X/postgres,postgres=X/postgres,anon=X/postgres,
--        authenticated=X/postgres,service_role=X/postgres}
--     The leading "=X/postgres" is the grant to PUBLIC, so revoking from anon
--     alone would leave the hole open. Both functions are SECURITY INVOKER, so
--     an anon caller is still bounded by the {authenticated}-only RLS on
--     rag_chunks / rag_documents / rag_source_registry and sees no rows; this
--     is a posture defect rather than a live leak, but it is the posture the
--     migration history intended and it is restored here.
--     Step 5 asserts the outcome so the migration fails loudly if it did not
--     take, per design §4.4.
--
--  2. R1 — lexical retrieval has no inverse document frequency.
--     rag_search_fulltext scores with pgroonga_score(), a raw occurrence
--     count over an OR of the query terms. A chunk that repeats a common word
--     outranks the one chunk that carries the rare identifier the farmer
--     asked about, which is how the identifier chunk fell out of the 30
--     candidates. pgroonga cannot supply IDF, and rag_chunks carries no
--     tsvector, so this adds one (steps 2 and 3) and a real BM25 ranking
--     function over it (step 4). Identifiers are first-class in that function:
--     a phrase match on an identifier adds its own inverse-document-frequency
--     mass on top of the BM25 score, so a rare code cannot be outweighed by
--     term repetition.
--
--  3. Candidate logging — design §4.4 puts a `candidates` jsonb on
--     rag_retrieval_logs so every candidate considered is recoverable, not
--     only the handful that survived the cut.
--
-- Language- and crop-agnostic by construction: the text search configuration
-- is 'simple', which neither stems nor removes stop words and therefore has no
-- language built into it. No language name, no crop name and no example term
-- appears anywhere below.
--
-- Idempotent and safe to re-run. Every statement stands alone — no session
-- state is carried between statements.
-- ============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. S3 — reconcile EXECUTE on the live 7-argument search RPCs.
--    Revoke from PUBLIC first: a grant to PUBLIC is inherited by every role,
--    so revoking only the named roles would leave it in force.
-- ─────────────────────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.rag_search_fulltext(text, integer, text[], text[], text[], uuid, text[]) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.rag_search_fulltext(text, integer, text[], text[], text[], uuid, text[]) FROM anon;

REVOKE ALL ON FUNCTION public.rag_search_vector(extensions.vector, integer, text[], text[], text[], uuid, text[]) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.rag_search_vector(extensions.vector, integer, text[], text[], text[], uuid, text[]) FROM anon;

GRANT EXECUTE ON FUNCTION public.rag_search_fulltext(text, integer, text[], text[], text[], uuid, text[]) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.rag_search_vector(extensions.vector, integer, text[], text[], text[], uuid, text[]) TO authenticated, service_role;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Lexical index support on rag_chunks.
--
--    chunk_tsv  — the tokenised chunk. 'simple' is used deliberately: it
--                 applies no stemmer and no stop-word list, so the same
--                 function behaves identically whatever script or language the
--                 corpus is written in. to_tsvector(regconfig, text) is
--                 IMMUTABLE, which is what lets this be a stored generated
--                 column.
--    tsv_len    — the document length term that BM25 length-normalisation
--                 needs. length(tsvector) counts distinct lexemes rather than
--                 raw tokens; it is derived from the same tokeniser as the
--                 term frequencies, so the normalisation stays internally
--                 consistent, and it is the quantity BM25 divides by.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.rag_chunks
  ADD COLUMN IF NOT EXISTS chunk_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('simple'::regconfig, chunk_text)) STORED;

ALTER TABLE public.rag_chunks
  ADD COLUMN IF NOT EXISTS tsv_len integer
  GENERATED ALWAYS AS (length(to_tsvector('simple'::regconfig, chunk_text))) STORED;

COMMENT ON COLUMN public.rag_chunks.chunk_tsv IS
  'Language-neutral (''simple'') tokenisation of chunk_text. Feeds rag_search_bm25; carries term positions, which are the term frequencies BM25 needs.';

COMMENT ON COLUMN public.rag_chunks.tsv_len IS
  'Distinct-lexeme length of chunk_tsv. BM25 length normalisation denominator.';

CREATE INDEX IF NOT EXISTS idx_rag_chunks_tsv ON public.rag_chunks USING gin (chunk_tsv);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. OR-combining aggregate over tsquery.
--    PostgreSQL ships the tsquery || tsquery operator but no aggregate for it.
--    Building the disjunction by string concatenation instead would mean
--    interpolating farmer-supplied text into a tsquery literal; this keeps the
--    query construction inside the parser, where it cannot be escaped from.
-- ─────────────────────────────────────────────────────────────────────────────

DROP AGGREGATE IF EXISTS public.tsquery_or_agg(tsquery);

CREATE AGGREGATE public.tsquery_or_agg(tsquery) (
  SFUNC = pg_catalog.tsquery_or,
  STYPE = tsquery
);

COMMENT ON AGGREGATE public.tsquery_or_agg(tsquery) IS
  'Disjunction of tsqueries. Used by rag_search_bm25 to build one indexable OR query from the caller''s term list without string interpolation.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. BM25 lexical retrieval with inverse document frequency.
--
--    Okapi BM25 with the standard k1 = 1.2, b = 0.75 and the Lucene IDF
--    variant ln(1 + (N - df + 0.5) / (df + 0.5)), which is always positive so
--    a term occurring in most chunks contributes little rather than negatively.
--
--    p_terms       — query terms. Scored by BM25.
--    p_identifiers — terms the caller has determined are identifiers (codes,
--                    product names, scheme names). Scored by BM25 as well,
--                    and additionally, when the chunk contains the identifier
--                    as a PHRASE, credited a second time with the sum of that
--                    identifier's lexeme IDFs. A phrase match on a rare token
--                    sequence is much stronger evidence than the same tokens
--                    scattered, and this is what stops a repeated common word
--                    from burying the one chunk that names the thing asked
--                    about. The weight is the identifier's own rarity — there
--                    is no tuned constant and no vocabulary in the function.
--
--    The filter predicates are copied verbatim from the live
--    rag_search_vector / rag_search_fulltext so all three legs admit exactly
--    the same population and RRF stays comparable across them.
--
--    Scale note: df is counted per lexeme across active chunks on each call.
--    At the current corpus and at the ~10k documents Phase 1 targets this is a
--    handful of GIN lookups. Beyond that the counts belong in a maintained
--    lexicon table, or in the external engine Phase 2 introduces.
-- ─────────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.rag_search_bm25(text[], integer, text[], text[], text[], uuid, text[], text[]);

CREATE FUNCTION public.rag_search_bm25(
  p_terms       text[],
  p_limit       integer DEFAULT 60,
  p_states      text[]  DEFAULT NULL,
  p_crops       text[]  DEFAULT NULL,
  p_doc_types   text[]  DEFAULT NULL,
  p_tenant      uuid    DEFAULT NULL,
  p_topics      text[]  DEFAULT NULL,
  p_identifiers text[]  DEFAULT NULL
)
RETURNS TABLE (
  chunk_id        uuid,
  document_id     uuid,
  chunk_text      text,
  section_path    text,
  page_number     integer,
  language        character varying,
  score           double precision,
  title           text,
  publisher       text,
  authority_tier  text,
  doc_type        text,
  doc_version     text,
  topic_codes     text[],
  matched_lexemes text[],
  identifier_hits integer
)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'extensions'
AS $function$
WITH
free_terms AS (
  SELECT DISTINCT btrim(t) AS term
  FROM unnest(COALESCE(p_terms, '{}'::text[])) AS t
  WHERE length(btrim(t)) >= 2
),
ident_terms AS (
  SELECT DISTINCT btrim(t) AS term
  FROM unnest(COALESCE(p_identifiers, '{}'::text[])) AS t
  WHERE length(btrim(t)) >= 2
),
all_terms AS (
  SELECT term FROM free_terms
  UNION
  SELECT term FROM ident_terms
),
lexemes AS (
  SELECT DISTINCT lx AS lexeme
  FROM all_terms t
  CROSS JOIN LATERAL unnest(tsvector_to_array(to_tsvector('simple'::regconfig, t.term))) AS lx
),
query AS (
  SELECT public.tsquery_or_agg(plainto_tsquery('simple'::regconfig, t.term)) AS tsq
  FROM all_terms t
),
corpus AS (
  SELECT GREATEST(count(*), 1)::numeric                  AS n_chunks,
         GREATEST(COALESCE(avg(tsv_len), 1), 1)::numeric AS avg_len
  FROM public.rag_chunks
  WHERE is_active
),
df AS (
  SELECT x.lexeme,
         ln(1 + (c.n_chunks - x.df + 0.5) / (x.df + 0.5)) AS idf
  FROM corpus c
  CROSS JOIN LATERAL (
    SELECT l.lexeme,
           (SELECT count(*)::numeric
              FROM public.rag_chunks c2
             WHERE c2.is_active
               AND c2.chunk_tsv @@ plainto_tsquery('simple'::regconfig, l.lexeme)) AS df
    FROM lexemes l
  ) x
),
cand AS (
  SELECT c.id, c.document_id, c.chunk_text, c.section_path, c.page_number, c.language,
         c.chunk_tsv, c.tsv_len,
         d.title, r.publisher, r.authority_tier, d.doc_type, d.doc_version,
         COALESCE(c.topic_codes, d.topic_codes) AS topic_codes
  FROM public.rag_chunks c
  JOIN public.rag_documents d       ON d.id = c.document_id
  JOIN public.rag_source_registry r ON r.id = d.source_id
  CROSS JOIN query q
  WHERE c.is_active AND d.is_active AND r.is_active
    AND q.tsq IS NOT NULL
    AND c.chunk_tsv @@ q.tsq
    AND (d.tenant_id IS NULL OR d.tenant_id = p_tenant)
    AND (p_states IS NULL OR d.state_codes IS NULL OR d.state_codes && p_states)
    AND (p_doc_types IS NULL OR d.doc_type = ANY(p_doc_types))
    AND (p_crops IS NULL OR c.crop_codes && p_crops OR d.crop_codes && p_crops
         OR (c.crop_codes IS NULL AND d.crop_codes IS NULL))
    AND (p_topics IS NULL OR c.topic_codes && p_topics OR d.topic_codes && p_topics
         OR (c.topic_codes IS NULL AND d.topic_codes IS NULL))
),
scored AS (
  SELECT cd.id, cd.document_id, cd.chunk_text, cd.section_path, cd.page_number, cd.language,
         cd.title, cd.publisher, cd.authority_tier, cd.doc_type, cd.doc_version, cd.topic_codes,
         COALESCE(b.bm25, 0)                 AS bm25,
         COALESCE(b.matched, '{}'::text[])   AS matched_lexemes,
         COALESCE(i.hits, 0)                 AS identifier_hits,
         COALESCE(i.boost, 0)                AS identifier_boost
  FROM cand cd
  CROSS JOIN corpus cp
  LEFT JOIN LATERAL (
    SELECT sum(
             d2.idf * ((f.freq * (1.2 + 1))
                       / (f.freq + 1.2 * (1 - 0.75 + 0.75 * cd.tsv_len / cp.avg_len)))
           )                            AS bm25,
           array_agg(DISTINCT u.lexeme) AS matched
    FROM unnest(cd.chunk_tsv) AS u(lexeme, positions, weights)
    JOIN df d2 ON d2.lexeme = u.lexeme
    CROSS JOIN LATERAL (
      SELECT GREATEST(COALESCE(array_length(u.positions, 1), 1), 1)::numeric AS freq
    ) f
  ) b ON true
  LEFT JOIN LATERAL (
    SELECT count(*)::integer            AS hits,
           COALESCE(sum(ib.idf_sum), 0) AS boost
    FROM ident_terms it
    CROSS JOIN LATERAL (
      SELECT COALESCE(sum(d3.idf), 0) AS idf_sum
      FROM unnest(tsvector_to_array(to_tsvector('simple'::regconfig, it.term))) AS lx
      JOIN df d3 ON d3.lexeme = lx
    ) ib
    WHERE cd.chunk_tsv @@ phraseto_tsquery('simple'::regconfig, it.term)
  ) i ON true
)
SELECT s.id, s.document_id, s.chunk_text, s.section_path, s.page_number, s.language,
       (s.bm25 + s.identifier_boost)::double precision AS score,
       s.title, s.publisher, s.authority_tier, s.doc_type, s.doc_version,
       s.topic_codes, s.matched_lexemes, s.identifier_hits
FROM scored s
ORDER BY (s.bm25 + s.identifier_boost) DESC, s.document_id, s.page_number
LIMIT p_limit;
$function$;

COMMENT ON FUNCTION public.rag_search_bm25(text[], integer, text[], text[], text[], uuid, text[], text[]) IS
  'Okapi BM25 lexical retrieval over rag_chunks.chunk_tsv with inverse document frequency, replacing the raw-occurrence pgroonga score for candidate generation. Identifier terms additionally earn their own IDF mass on a phrase match. SECURITY INVOKER; callable by authenticated and service_role only.';

REVOKE ALL ON FUNCTION public.rag_search_bm25(text[], integer, text[], text[], text[], uuid, text[], text[]) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.rag_search_bm25(text[], integer, text[], text[], text[], uuid, text[], text[]) FROM anon;

GRANT EXECUTE ON FUNCTION public.rag_search_bm25(text[], integer, text[], text[], text[], uuid, text[], text[]) TO authenticated, service_role;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Assert the S3 outcome (design §4.4: "asserted by a check in the
--    migration"). Fails the migration rather than reporting success on a
--    privilege state that was not actually reached.
-- ─────────────────────────────────────────────────────────────────────────────

DO $assert$
DECLARE
  v_fn    text;
  v_leaky text[] := '{}';
BEGIN
  FOREACH v_fn IN ARRAY ARRAY[
    'public.rag_search_fulltext(text, integer, text[], text[], text[], uuid, text[])',
    'public.rag_search_vector(extensions.vector, integer, text[], text[], text[], uuid, text[])',
    'public.rag_search_bm25(text[], integer, text[], text[], text[], uuid, text[], text[])'
  ] LOOP
    IF has_function_privilege('anon', v_fn, 'EXECUTE') THEN
      v_leaky := v_leaky || (v_fn || ' [anon]');
    END IF;
    IF has_function_privilege('public', v_fn, 'EXECUTE') THEN
      v_leaky := v_leaky || (v_fn || ' [PUBLIC]');
    END IF;
    IF NOT has_function_privilege('authenticated', v_fn, 'EXECUTE') THEN
      RAISE EXCEPTION 'RAG search RPC % is not executable by authenticated — the farmer path would break', v_fn;
    END IF;
  END LOOP;

  IF array_length(v_leaky, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'RAG search RPCs still executable by an unintended role: %', array_to_string(v_leaky, ', ');
  END IF;
END
$assert$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Candidate logging (design §4.4).
--    chunks_returned already records the evidence that survived the cut.
--    `candidates` records every candidate that was considered and why it was
--    or was not kept, so a retrieval that dropped the right chunk can be
--    diagnosed from the log alone instead of being re-run.
--    rag_retrieval_logs is partitioned by month; ADD COLUMN on the parent
--    propagates to every existing partition.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.rag_retrieval_logs
  ADD COLUMN IF NOT EXISTS candidates jsonb;

COMMENT ON COLUMN public.rag_retrieval_logs.candidates IS
  'Every candidate considered for this retrieval, with its per-leg scores, rerank score and the gate that admitted or dropped it. chunks_returned holds only the survivors.';
