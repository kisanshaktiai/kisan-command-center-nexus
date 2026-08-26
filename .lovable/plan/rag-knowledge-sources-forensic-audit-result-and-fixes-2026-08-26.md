# RAG Knowledge Sources — forensic audit result and fixes

## What I verified (live DB + code, this turn)

The RAG subsystem is present and wired end to end. Confirmed working:

- Route `/super-admin/governance/knowledge` is registered in `SuperAdmin.tsx` and linked from the sidebar ("Knowledge Sources").
- `rag-admin` edge function exists with `verify_jwt = true`, authenticates the caller via `is_super_admin()` (function exists in the DB), and does all privileged work with the service role. All 7 actions the UI calls (`list_sources`, `upsert_source`, `list_topics`, `create_upload`, `ingest`, `list_documents`, `set_document_active`, `retrieval_stats`) are implemented.
- Tables exist with matching columns: `rag_source_registry`, `rag_documents`, `rag_chunks` (both have `topic_codes`), `rag_topics` (20 active rows), partitioned `rag_retrieval_logs`.
- Table privileges are correct: `authenticated` has SELECT on the rag tables; the `rag-documents` bucket exists and has no storage policies (service-role-only, matching the signed-URL upload flow).
- Direct-from-browser lookups in `useRagAdmin.ts` match reality: `crops.value/label/is_active/display_order`, `states.code/name`, `tenants.id/name/slug` all exist and are readable.
- Search RPCs `rag_search_fulltext` and `rag_search_vector` both accept `p_topics`, so the category dimension the UI writes is actually used by retrieval.
- Current corpus: 1 source, 1 document (completed), 41 chunks, 8 retrieval logs.

So this is not a broken-wiring situation. Three concrete defects came out of the audit.

## Defect 1 — Documents table columns are shifted (real UI bug)

The Documents table header has 11 columns (Title, Source, Category, Ver, Lang, Scope, Status, Chunks, Embedding, Added, Active) but each row renders only 10 cells — the **Category** cell is missing. Every value from "Ver" onward is displayed under the wrong heading, and `topic_codes` (the category the upload flow carefully validates and stores) is never shown at all, even though the Category filter above the table works.

Fix: render a Category cell after Source using the existing `TopicBadge` (first 3 codes + "+N" overflow, "uncategorised" when empty).

## Defect 2 — Upload accepts .md/.txt, ingest rejects them after the file is already stored

`RAG_ALLOWED_EXTENSIONS = ['pdf','md','txt']` drives the file picker and validation, and `create_upload` signs a URL for any of the three. But the `ingest` action hard-rejects anything that is not `.pdf` ("rag-ingest currently accepts PDF only"). Result: a Markdown/text upload lands in the private bucket, then fails — leaving an orphan object and a confusing error.

Fix (frontend only, no backend behaviour change): add `RAG_INGESTABLE_EXTENSIONS = ['pdf']` to `ragAdminService.ts` and use it for the picker `accept`, the extension check and the helper text, keeping `RAG_ALLOWED_EXTENSIONS` as the storage-level list. The card already says PDF-only in its description; this makes the control agree with it.

## Defect 3 — Corpus has zero embeddings; the UI does not say so

All 41 chunks have `embedding IS NULL` and the document's `embedding_model` is null, so `rag_search_vector` can return nothing today — retrieval is fulltext-only. The Documents table shows a bare "—" in the Embedding column, which reads as "unknown" rather than "semantic search is off for this document".

Fix: in the Embedding cell, when a document is `completed` with no `embedding_model`, show a warning-styled "not embedded · fulltext only" label instead of "—". Root cause sits in the shared `rag-ingest` function's embedding provider config (outside this repo), so this change only surfaces the state honestly — no ingest logic is touched.

## Files changed

- `src/pages/super-admin/KnowledgeSources.tsx` — add the missing Category cell; embedding-coverage label.
- `src/services/ragAdminService.ts` — add `RAG_INGESTABLE_EXTENSIONS`.
- `src/components/rag/RagDocumentUploadCard.tsx` — use the ingestable list for accept/validation/hints.

No database migration, no edge function change, no change to the upload/ingest contract.
