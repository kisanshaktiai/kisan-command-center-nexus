/**
 * rag-admin — SaaS-admin-panel gateway to the shared RAG knowledge base.
 *
 * WHY THIS EXISTS (verified live, 2026-08-24):
 *  - bucket `rag-documents` is private with NO storage policies ⇒ only the service
 *    role can write to it; the browser cannot upload directly.
 *  - rag_source_registry / rag_documents have SELECT-only RLS for `authenticated`
 *    ⇒ the panel cannot INSERT/UPDATE them via PostgREST.
 *  - rag-ingest has verify_jwt=false and no auth check ⇒ must never be called from a UI.
 *  So the panel calls THIS function (verify_jwt=true) which authenticates the caller
 *  as a super admin (same pattern as governance-audit) and does privileged work with
 *  the service role.
 *
 * Actions (POST JSON { action, ... }):
 *  list_sources                      → registry rows (+ document counts)
 *  upsert_source  {source}           → insert/update rag_source_registry (CHECK-validated)
 *  list_topics                      → rag_topics taxonomy (subject categories)
 *  create_upload  {sourceCode, fileName, topicCodes, title?, docVersion?, language?}
 *                                    → signed upload URL for bucket rag-documents + storagePath
 *                                      path = {source}/{primary-topic-dir}/{yyyy}/{title-slug}__v{ver}__{lang}__{stamp}.{ext}
 *  ingest         {storagePath, sourceCode, title, topicCodes, docVersion?, language?, stateCodes?,
 *                  cropCodes?, docType?, publicationDate?, validFrom?, validUntil?,
 *                  tenantId?, embed?}
 *                                    → server-side call to rag-ingest (service role)
 *  list_documents {sourceCode?, status?, topicCode?, limit?}
 *  set_document_active {documentId, isActive}
 *  backfill_embeddings {documentId}   → server-side call to rag-ingest backfill_embeddings; embeds the
 *                                      document's chunks that have no vector (no re-upload, no re-chunk)
 *  retrieval_stats {days?}           → counts from rag_retrieval_logs (below_threshold = corpus gaps)
 *
 * Every mutating action writes admin_audit_logs (admin_id, action, details).
 * The "type of source" is captured ONCE, on the registry row: publisher,
 * authority_tier, doc_type, state_codes, usage_rights, trust_prior — every
 * document ingested under that source_code inherits it, and retrieval ranks by it.
 *
 * The SUBJECT of a document (seeds, fertilizer, weed control, herbicides,
 * pesticides…) is a separate dimension: topic_codes ⊂ rag_topics.code, set
 * per document at upload time, denormalised to rag_chunks, filtered by
 * rag_search_vector / rag_search_fulltext (p_topics), and used as the folder
 * segment of the storage path so the bucket is browsable by category.
 */

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const BUCKET = 'rag-documents';
// Live CHECK constraints on rag_source_registry (verified 2026-08-24)
const AUTHORITY_TIERS = ['central_govt', 'icar', 'state_agri_university', 'state_govt', 'kvk', 'other'] as const;
const DOC_TYPES = ['scheme', 'package_of_practices', 'advisory', 'faq', 'regulation', 'other'] as const;
const SOURCE_CODE_RE = /^[A-Z0-9_]{3,64}$/;
const ALLOWED_EXT = ['pdf', 'md', 'txt'];
const SIGNED_UPLOAD_TTL_S = 600;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function safeFileName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/_+/g, '_').slice(0, 120);
}

/** "Sugarcane Package of Practices 2024-25" → "sugarcane-package-of-practices-2024-25" */
function slugify(v: string, max = 60): string {
  return v.normalize('NFKD').replace(/[^\x00-\x7F]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max);
}

function normTopicCodes(v: unknown): string[] {
  return Array.isArray(v) ? [...new Set(v.map((t) => String(t).toLowerCase().trim()).filter(Boolean))] : [];
}

/** Returns active rag_topics rows for the codes, or an error message naming the bad ones. */
async function resolveTopics(sb: SupabaseClient, codes: string[]) {
  if (!codes.length) return { error: 'topicCodes is required (at least one category)' };
  const { data, error } = await sb.from('rag_topics').select('code, storage_dir, is_active').in('code', codes);
  if (error) return { error: error.message };
  const found = new Map((data || []).map((t) => [t.code, t]));
  const bad = codes.filter((c) => !found.get(c)?.is_active);
  if (bad.length) return { error: `Unknown or inactive topic codes (rag_topics.code): ${bad.join(', ')}` };
  return { topics: codes.map((c) => found.get(c)!) };
}

/**
 * Category-first, deterministic storage path. The primary topic (first code)
 * decides the folder; the file name carries title, version, language and a
 * timestamp so re-uploads never collide and are sortable in the bucket UI.
 *   mpkv_sugarcane_pop/weed-control/2026/sugarcane-weed-management__v2__mr__20260826-1130.pdf
 */
function buildStoragePath(sourceCode: string, topicDir: string, title: string, fileName: string, docVersion: string, language: string, ext: string): string {
  const now = new Date();
  // Non-Latin titles (Marathi/Hindi) slug to '' → fall back to the uploaded file name, then a constant.
  const base = slugify(title) || slugify(fileName.replace(/\.[^.]+$/, '')) || 'document';
  const stamp = now.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 13); // yyyymmdd-hhmm
  const ver = slugify(docVersion, 12) || '1';
  const lang = slugify(language, 8) || 'en';
  return `${sourceCode.toLowerCase()}/${topicDir}/${now.getUTCFullYear()}/${base}__v${ver}__${lang}__${stamp}.${ext}`;
}

async function audit(sb: SupabaseClient, adminId: string, action: string, details: Record<string, unknown>, ms: number, req: Request) {
  try {
    await sb.from('admin_audit_logs').insert({
      admin_id: adminId,
      action: `rag.${action}`,
      details,
      duration_ms: ms,
      user_agent: req.headers.get('user-agent'),
      security_context: { function: 'rag-admin' },
    });
  } catch (e) {
    console.warn('[rag-admin] audit log failed:', (e as Error).message);
  }
}

export const RAG_ACTIONS = [
  'list_sources', 'upsert_source', 'list_topics', 'create_upload', 'ingest',
  'list_documents', 'set_document_active', 'backfill_embeddings', 'retrieval_stats',
] as const;

export function isRagAction(action: unknown): boolean {
  return typeof action === 'string' && (RAG_ACTIONS as readonly string[]).includes(action);
}

export async function handleRagAdmin(req: Request, preParsedBody?: Record<string, any>): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'POST only' });
  const t0 = Date.now();

  // ── Authn/Authz: same contract as governance-audit (JWT-bound anon client + is_super_admin)
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) return json(401, { error: 'Unauthorized' });
  const { data: isAdmin } = await userClient.rpc('is_super_admin');
  if (!isAdmin) return json(403, { error: 'Forbidden: super admin required' });
  const adminId = userRes.user.id;

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  let body: Record<string, any> = preParsedBody ?? {};
  if (!preParsedBody) {
    try { body = await req.json(); } catch { return json(400, { error: 'Invalid JSON body' }); }
  }
  const action = String(body.action || '');

  try {
    switch (action) {
      // ───────────────────────────────────────────── list_sources
      case 'list_sources': {
        const { data: sources, error } = await sb.from('rag_source_registry').select('*').order('publisher');
        if (error) return json(500, { error: error.message });
        const { data: docs } = await sb.from('rag_documents').select('source_id, processing_status');
        const counts: Record<string, { total: number; completed: number; failed: number }> = {};
        for (const d of docs || []) {
          const c = (counts[d.source_id] ??= { total: 0, completed: 0, failed: 0 });
          c.total++;
          if (d.processing_status === 'completed') c.completed++;
          if (d.processing_status === 'failed') c.failed++;
        }
        return json(200, {
          sources: (sources || []).map((s) => ({ ...s, documents: counts[s.id] ?? { total: 0, completed: 0, failed: 0 } })),
          enums: { authority_tiers: AUTHORITY_TIERS, doc_types: DOC_TYPES },
        });
      }

      // ───────────────────────────────────────────── list_topics
      case 'list_topics': {
        const { data, error } = await sb.from('rag_topics')
          .select('code, label, topic_group, storage_dir, aliases, description, sort_order, is_active')
          .order('sort_order');
        if (error) return json(500, { error: error.message });
        return json(200, { topics: data });
      }

      // ───────────────────────────────────────────── upsert_source
      case 'upsert_source': {
        const s = body.source || {};
        const sourceCode = String(s.source_code || '').trim().toUpperCase();
        if (!SOURCE_CODE_RE.test(sourceCode)) return json(400, { error: 'source_code must match ^[A-Z0-9_]{3,64}$' });
        if (!s.publisher?.trim()) return json(400, { error: 'publisher is required' });
        if (!AUTHORITY_TIERS.includes(s.authority_tier)) return json(400, { error: `authority_tier must be one of ${AUTHORITY_TIERS.join(', ')}` });
        if (!DOC_TYPES.includes(s.doc_type)) return json(400, { error: `doc_type must be one of ${DOC_TYPES.join(', ')}` });
        const stateCodes: string[] | null = Array.isArray(s.state_codes) && s.state_codes.length
          ? s.state_codes.map((x: string) => String(x).toUpperCase().trim()) : null;
        if (stateCodes) {
          const { data: known } = await sb.from('states').select('code').in('code', stateCodes);
          const bad = stateCodes.filter((c) => !(known || []).some((k) => k.code === c));
          if (bad.length) return json(400, { error: `Unknown state codes: ${bad.join(', ')}` });
        }
        const trust = s.trust_prior == null ? null : Number(s.trust_prior);
        if (trust != null && (Number.isNaN(trust) || trust < 0 || trust > 1)) return json(400, { error: 'trust_prior must be 0..1' });

        const row = {
          source_code: sourceCode,
          publisher: String(s.publisher).trim(),
          authority_tier: s.authority_tier,
          doc_type: s.doc_type,
          state_codes: stateCodes,
          default_language: String(s.default_language || 'en').slice(0, 8),
          source_url: s.source_url ? String(s.source_url).trim() : null,
          usage_rights: s.usage_rights ? String(s.usage_rights).trim() : null,
          trust_prior: trust,
          notes: s.notes ? String(s.notes) : null,
          is_active: s.is_active ?? true,
          updated_at: new Date().toISOString(),
        };
        const { data, error } = await sb.from('rag_source_registry').upsert(row, { onConflict: 'source_code' }).select('*').single();
        if (error) return json(400, { error: error.message });
        await audit(sb, adminId, 'upsert_source', { source_code: sourceCode, authority_tier: row.authority_tier, doc_type: row.doc_type }, Date.now() - t0, req);
        return json(200, { source: data });
      }

      // ───────────────────────────────────────────── create_upload
      case 'create_upload': {
        const sourceCode = String(body.sourceCode || '').trim().toUpperCase();
        const fileName = safeFileName(String(body.fileName || ''));
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        if (!SOURCE_CODE_RE.test(sourceCode)) return json(400, { error: 'sourceCode invalid' });
        if (!ALLOWED_EXT.includes(ext)) return json(400, { error: `Only ${ALLOWED_EXT.join(', ')} files are accepted` });
        const { data: src } = await sb.from('rag_source_registry').select('id, is_active').eq('source_code', sourceCode).maybeSingle();
        if (!src) return json(400, { error: `Source '${sourceCode}' not registered — create it first` });
        if (!src.is_active) return json(400, { error: `Source '${sourceCode}' is inactive` });

        // Category decides the folder. Validated here so a typo never lands in the bucket.
        const topicCodes = normTopicCodes(body.topicCodes);
        const resolved = await resolveTopics(sb, topicCodes);
        if ('error' in resolved) return json(400, { error: resolved.error });
        const primary = resolved.topics![0];

        const title = String(body.title || fileName.replace(/\.[^.]+$/, ''));
        const storagePath = buildStoragePath(sourceCode, primary.storage_dir, title, fileName, String(body.docVersion ?? '1'), String(body.language ?? 'en'), ext);
        const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(storagePath);
        if (error || !data) return json(500, { error: `Signed upload URL failed: ${error?.message}` });
        await audit(sb, adminId, 'create_upload', { source_code: sourceCode, storage_path: storagePath, topic_codes: topicCodes }, Date.now() - t0, req);
        // Client: supabase.storage.from('rag-documents').uploadToSignedUrl(storagePath, token, file)
        return json(200, { storagePath, token: data.token, signedUrl: data.signedUrl, expiresInSeconds: SIGNED_UPLOAD_TTL_S, primaryTopic: primary.code });
      }

      // ───────────────────────────────────────────── ingest
      case 'ingest': {
        const { storagePath, sourceCode, title } = body;
        if (!storagePath || !sourceCode || !title) return json(400, { error: 'storagePath, sourceCode and title are required' });
        const ext = String(storagePath).split('.').pop()?.toLowerCase() || '';
        if (ext !== 'pdf') return json(400, { error: `rag-ingest currently accepts PDF only (got .${ext}); markdown/text ingestion not deployed yet` });

        // Validate crop codes against SSOT so bad metadata never reaches rag_documents
        let cropCodes: string[] | null = null;
        if (Array.isArray(body.cropCodes) && body.cropCodes.length) {
          const wanted = body.cropCodes.map((c: string) => String(c).toLowerCase().trim());
          const { data: known } = await sb.from('crops').select('value').in('value', wanted);
          const bad = wanted.filter((c: string) => !(known || []).some((k) => k.value === c));
          if (bad.length) return json(400, { error: `Unknown crop codes (crops.value): ${bad.join(', ')}` });
          cropCodes = wanted;
        }
        if (body.docType && !DOC_TYPES.includes(body.docType)) return json(400, { error: 'docType invalid' });

        const topicCodes = normTopicCodes(body.topicCodes);
        const resolvedTopics = await resolveTopics(sb, topicCodes);
        if ('error' in resolvedTopics) return json(400, { error: resolvedTopics.error });

        const payload = {
          action: 'ingest',
          storagePath, sourceCode: String(sourceCode).toUpperCase(), title,
          docVersion: body.docVersion ?? '1',
          language: body.language ?? 'en',
          stateCodes: Array.isArray(body.stateCodes) && body.stateCodes.length ? body.stateCodes : null,
          cropCodes,
          topicCodes,                        // rag-ingest may persist this directly once extended
          docType: body.docType ?? null,
          publicationDate: body.publicationDate ?? null,
          validFrom: body.validFrom ?? null,
          validUntil: body.validUntil ?? null,
          tenantId: body.tenantId ?? null,   // null = global corpus (all tenants)
          embed: body.embed === true,
        };
        // Server-to-server call; service role never leaves the edge runtime.
        const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/rag-ingest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
          body: JSON.stringify(payload),
        });
        const result = await res.json().catch(() => ({ error: 'rag-ingest returned non-JSON' }));

        // Persist topic_codes on the document and its chunks. rag-ingest v1
        // ignores `topicCodes` (it destructures a fixed field list), so this
        // write is what actually stores the category today. On a content-hash
        // duplicate we MERGE with the existing codes instead of overwriting.
        if (result?.documentId) {
          let codes = topicCodes;
          if (result.deduplicated) {
            const { data: existing } = await sb.from('rag_documents').select('topic_codes').eq('id', result.documentId).maybeSingle();
            codes = [...new Set([...(existing?.topic_codes ?? []), ...topicCodes])];
          }
          const { error: tErr } = await sb.from('rag_documents')
            .update({ topic_codes: codes, updated_at: new Date().toISOString() }).eq('id', result.documentId);
          if (tErr) console.warn('[rag-admin] topic_codes update (document) failed:', tErr.message);
          const { error: cErr } = await sb.from('rag_chunks')
            .update({ topic_codes: codes }).eq('document_id', result.documentId);
          if (cErr) console.warn('[rag-admin] topic_codes update (chunks) failed:', cErr.message);
          result.topic_codes = codes;
        }

        await audit(sb, adminId, 'ingest', { storage_path: storagePath, source_code: payload.sourceCode, topic_codes: topicCodes, status: res.status, document_id: result?.documentId ?? null, chunks: result?.chunks ?? null, deduplicated: !!result?.deduplicated, error: result?.error ?? null }, Date.now() - t0, req);

        // rag-ingest answers 422 for a *registered* document that failed processing
        // (e.g. SCANNED_OR_EMPTY_PDF). supabase-js turns any non-2xx into an opaque
        // FunctionsHttpError, so relay documented outcomes as 200 and let the panel
        // read processing_status / error. Genuine upstream faults stay non-2xx.
        const documented = res.ok || (res.status === 422 && result?.documentId);
        return json(documented ? 200 : res.status, { ...result, upstream_status: res.status });
      }

      // ───────────────────────────────────────────── list_documents
      case 'list_documents': {
        let q = sb.from('rag_documents')
          .select('id, title, doc_version, language, doc_type, state_codes, crop_codes, topic_codes, processing_status, processing_error, chunk_count, embedding_model, is_active, file_url, publication_date, created_at, tenant_id, rag_source_registry!inner(source_code, publisher, authority_tier)')
          .order('created_at', { ascending: false })
          .limit(Math.min(Number(body.limit) || 100, 500));
        if (body.sourceCode) q = q.eq('rag_source_registry.source_code', String(body.sourceCode).toUpperCase());
        if (body.status) q = q.eq('processing_status', body.status);
        if (body.topicCode) q = q.contains('topic_codes', [String(body.topicCode).toLowerCase()]);
        const { data, error } = await q;
        if (error) return json(500, { error: error.message });
        return json(200, { documents: data });
      }

      // ───────────────────────────────────────────── set_document_active
      case 'set_document_active': {
        const { documentId, isActive } = body;
        if (!documentId || typeof isActive !== 'boolean') return json(400, { error: 'documentId and isActive(boolean) required' });
        const { error } = await sb.from('rag_documents').update({ is_active: isActive, updated_at: new Date().toISOString() }).eq('id', documentId);
        if (error) return json(500, { error: error.message });
        const { error: cErr } = await sb.from('rag_chunks').update({ is_active: isActive }).eq('document_id', documentId);
        if (cErr) return json(500, { error: cErr.message });
        await audit(sb, adminId, 'set_document_active', { document_id: documentId, is_active: isActive }, Date.now() - t0, req);
        return json(200, { ok: true });
      }

      // ───────────────────────────────────────────── backfill_embeddings
      // A document ingested before the embedding provider was configured (or whose
      // embed step failed) has chunks but no vectors, so semantic retrieval never
      // sees it. rag-ingest already exposes `backfill_embeddings`; relay it here so
      // the panel can fix it with one click instead of curl + service-role key.
      case 'backfill_embeddings': {
        const documentId = String(body.documentId || '');
        if (!/^[0-9a-f-]{36}$/i.test(documentId)) return json(400, { error: 'documentId (uuid) required' });
        const { data: doc } = await sb.from('rag_documents').select('id, processing_status').eq('id', documentId).maybeSingle();
        if (!doc) return json(404, { error: 'Document not found' });
        if (doc.processing_status !== 'completed') return json(400, { error: `Document is '${doc.processing_status}', not completed` });
        const { count: pending } = await sb.from('rag_chunks').select('id', { count: 'exact', head: true })
          .eq('document_id', documentId).eq('is_active', true).is('embedding', null);
        if (!pending) return json(200, { embedded: 0, pending: 0, message: 'All chunks already embedded' });

        const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/rag-ingest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
          body: JSON.stringify({ action: 'backfill_embeddings', documentId, maxChunks: 960 }),
        });
        const result = await res.json().catch(() => ({ error: 'rag-ingest returned non-JSON' }));
        await audit(sb, adminId, 'backfill_embeddings', { document_id: documentId, pending, status: res.status, embedded: result?.embedded ?? null, model: result?.model ?? null, error: result?.error ?? null }, Date.now() - t0, req);
        if (!res.ok) return json(res.status, { error: result?.error || result?.detail || `rag-ingest ${res.status}`, upstream_status: res.status });
        return json(200, { ...result, pending, upstream_status: res.status });
      }

      // ───────────────────────────────────────────── retrieval_stats
      case 'retrieval_stats': {
        const days = Math.min(Math.max(Number(body.days) || 7, 1), 90);
        const since = new Date(Date.now() - days * 86400_000).toISOString();
        const { data, error } = await sb.from('rag_retrieval_logs')
          .select('retrieval_mode, retrieval_purpose, below_threshold, query_language, latency_ms')
          .gte('created_at', since).limit(5000);
        if (error) return json(500, { error: error.message });
        const rows = data || [];
        const gaps = rows.filter((r) => r.below_threshold).length;
        const byLang: Record<string, number> = {};
        for (const r of rows) byLang[r.query_language || 'unknown'] = (byLang[r.query_language || 'unknown'] || 0) + 1;
        const avgLatency = rows.length ? Math.round(rows.reduce((a, r) => a + (r.latency_ms || 0), 0) / rows.length) : 0;
        return json(200, { days, total: rows.length, below_threshold: gaps, gap_rate: rows.length ? +(gaps / rows.length).toFixed(3) : 0, by_language: byLang, avg_latency_ms: avgLatency });
      }

      default:
        return json(400, { error: `Unknown action '${action}'` });
    }
  } catch (e) {
    console.error('[rag-admin] fatal', (e as Error).message);
    return json(500, { error: 'Internal error', detail: (e as Error).message });
  }
}

// deploy 2026-08-27
