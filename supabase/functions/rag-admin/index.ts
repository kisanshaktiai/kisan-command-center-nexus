/**
 * rag-admin — thin wrapper around the shared RAG admin handler.
 *
 * NOTE (2026-08-26): this Supabase project is at its deployed edge-function
 * ceiling, so a *new* function slug (`rag-admin`) cannot be created — calls to
 * it return 404 "Requested function was not found", which the browser surfaces
 * as "Failed to send a request to the Edge Function".
 * The real logic therefore lives in `_shared/ragAdmin.ts` and is also mounted
 * inside the already-deployed `governance-audit` function (action-routed).
 * This wrapper stays so the dedicated slug works the moment a slot frees up;
 * the frontend prefers it and falls back to `governance-audit` on 404.
 */
import { handleRagAdmin } from '../_shared/ragAdmin.ts';

Deno.serve((req: Request) => handleRagAdmin(req));
