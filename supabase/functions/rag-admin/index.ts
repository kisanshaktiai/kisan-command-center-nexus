/**
 * rag-admin — dedicated slug for the RAG admin handler (see _shared/ragAdmin.ts).
 * The same handler is also action-routed inside governance-audit as a fallback.
 */
import { handleRagAdmin } from '../_shared/ragAdmin.ts';

Deno.serve((req: Request) => handleRagAdmin(req));
