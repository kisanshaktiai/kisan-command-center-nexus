# RAG upload recovery
- [x] Trace compute exhaustion to the shared rag-ingest PDF processor; the later attempt also confirms missing text/OCR.
- [x] Deploy recorded-failure recovery through both RAG admin entrypoints and contain upload promise rejections.
- [x] Pass targeted client/server regression tests and preview validation.
- [ ] Correct upstream PDF processing in kisanshakti-ai-v1 — blocked: its source is owned by another project with read-only access here.
- [ ] Verify a real signed-in upload — blocked: administrator sessions cannot be minted for this external Supabase project.