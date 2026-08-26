import { supabase } from '@/integrations/supabase/client';

/**
 * ragAdminService — thin client for the `rag-admin` edge function.
 *
 * Every call goes through the edge function (verify_jwt = true, super-admin
 * enforced server-side). The browser never touches `rag_source_registry`,
 * `rag_documents` or the private `rag-documents` bucket directly:
 *   - registry / documents have SELECT-only RLS for `authenticated`
 *   - the bucket has no storage policies (service role only)
 *   - `rag-ingest` has no auth and must never be called from a UI
 */

// ── Enums (mirrors live CHECK constraints on rag_source_registry) ───────────
export const RAG_AUTHORITY_TIERS = [
  'central_govt',
  'icar',
  'state_agri_university',
  'state_govt',
  'kvk',
  'other',
] as const;
export type RagAuthorityTier = (typeof RAG_AUTHORITY_TIERS)[number];

export const RAG_DOC_TYPES = [
  'scheme',
  'package_of_practices',
  'advisory',
  'faq',
  'regulation',
  'other',
] as const;
export type RagDocType = (typeof RAG_DOC_TYPES)[number];

export type RagProcessingStatus =
  'pending' | 'processing' | 'completed' | 'failed' | string;

export const RAG_SOURCE_CODE_RE = /^[A-Z0-9_]{3,64}$/;

/** Subject category of a document (seeds, fertilizer, weed control, herbicides…). SSOT = rag_topics. */
export interface RagTopic {
  code: string;
  label: string;
  topic_group:
    'inputs' | 'protection' | 'agronomy' | 'economics' | 'other' | string;
  storage_dir: string;
  aliases: string[];
  description: string | null;
  sort_order: number;
  is_active: boolean;
}
/** Extensions the bucket + create_upload accept (storage level). */
export const RAG_ALLOWED_EXTENSIONS = ['pdf', 'md', 'txt'] as const;
/**
 * Extensions rag-ingest can actually parse today. The `ingest` action rejects
 * anything else AFTER the file has landed in the bucket, so the picker must be
 * limited to this list to avoid orphan objects.
 */
export const RAG_INGESTABLE_EXTENSIONS = ['pdf'] as const;


// ── Row shapes returned by the function ─────────────────────────────────────
export interface RagSource {
  id: string;
  source_code: string;
  publisher: string;
  authority_tier: RagAuthorityTier;
  doc_type: RagDocType;
  state_codes: string[] | null;
  default_language: string;
  source_url: string | null;
  usage_rights: string | null;
  trust_prior: number | null;
  notes: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  documents: { total: number; completed: number; failed: number };
}

export interface RagSourceInput {
  source_code: string;
  publisher: string;
  authority_tier: RagAuthorityTier;
  doc_type: RagDocType;
  state_codes?: string[] | null;
  default_language?: string;
  source_url?: string | null;
  usage_rights?: string | null;
  trust_prior?: number | null;
  notes?: string | null;
  is_active?: boolean;
}

export interface RagDocument {
  id: string;
  title: string;
  doc_version: string;
  language: string;
  doc_type: string;
  state_codes: string[] | null;
  crop_codes: string[] | null;
  topic_codes: string[] | null;
  processing_status: RagProcessingStatus;
  processing_error: string | null;
  chunk_count: number | null;
  embedding_model: string | null;
  is_active: boolean | null;
  file_url: string | null;
  publication_date: string | null;
  created_at: string | null;
  tenant_id: string | null;
  rag_source_registry: {
    source_code: string;
    publisher: string;
    authority_tier: RagAuthorityTier;
  };
}

export interface RagIngestMeta {
  sourceCode: string;
  title: string;
  /** ≥1 required. First code = primary category = storage folder. */
  topicCodes: string[];
  docVersion?: string;
  language?: string;
  stateCodes?: string[];
  cropCodes?: string[];
  docType?: RagDocType;
  publicationDate?: string;
  validFrom?: string;
  validUntil?: string;
  /** null / undefined = shared global corpus (all tenants) */
  tenantId?: string | null;
  embed?: boolean;
}

export interface RagIngestResult {
  documentId: string;
  pages: number;
  chunks: number;
  sectionsDetected: number;
  tables: number;
  processing_status: RagProcessingStatus;
  processing_error?: string | null;
  topic_codes?: string[];
  /** rag-ingest note, e.g. "embedded=41 model=…" or "provider_unconfigured — fulltext-only" */
  embedding?: string;
  /** Same content hash already ingested — no new document created. */
  deduplicated?: boolean;
  message?: string;
  upstream_status?: number;
  error?: string;
}

export interface RagRetrievalStats {
  days: number;
  total: number;
  below_threshold: number;
  gap_rate: number;
  by_language: Record<string, number>;
  avg_latency_ms: number;
}

export type RagUploadStage = 'signing' | 'uploading' | 'ingesting';

export interface RagListSourcesResponse {
  sources: RagSource[];
  enums: { authority_tiers: RagAuthorityTier[]; doc_types: RagDocType[] };
}

// ── Transport ───────────────────────────────────────────────────────────────
/**
 * supabase-js wraps any non-2xx edge response in FunctionsHttpError whose
 * `context` is the raw Response; the JSON body (with the real `error`) is
 * only reachable there. Surface it so the panel never shows a bare
 * "non-2xx status code".
 */
async function extractError(error: unknown): Promise<string> {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = await ctx.clone().json();
      if (body?.error) return String(body.error);
    } catch {
      /* not JSON */
    }
  }
  return (error as Error)?.message || 'Request failed';
}

/**
 * The dedicated `rag-admin` slug cannot be deployed (this Supabase project sits
 * at its edge-function ceiling), so the RAG admin handler is mounted inside the
 * already-deployed `governance-audit` function and action-routed there.
 */
const RAG_FN = 'governance-audit';

async function invoke<T>(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(RAG_FN, {
    body: { action, ...payload },
  });
  if (error) throw new Error(await extractError(error));
  return data as T;
}

/**
 * Standard call: a body-level `error` is a failure, and so is a 200 whose shape
 * does not contain the expected key — that happens when the host function is
 * running a build that predates the RAG mount and answers with its own payload.
 */
async function call<T>(
  action: string,
  payload: Record<string, unknown> = {},
  expectKey?: keyof T & string
): Promise<T> {
  const data = await invoke<T>(action, payload);
  if ((data as { error?: string })?.error) {
    throw new Error((data as { error: string }).error);
  }
  if (expectKey && (data as Record<string, unknown>)?.[expectKey] === undefined) {
    throw new Error(
      `Unexpected response for '${action}' — the knowledge-base endpoint is not serving RAG actions yet. Please retry in a moment.`
    );
  }
  return data;
}


export const ragAdminService = {
  listSources: () => call<RagListSourcesResponse>('list_sources'),

  upsertSource: (source: RagSourceInput) =>
    call<{ source: RagSource }>('upsert_source', { source }),

  listDocuments: (
    filters: {
      sourceCode?: string;
      status?: string;
      topicCode?: string;
      limit?: number;
    } = {}
  ) => call<{ documents: RagDocument[] }>('list_documents', filters),

  listTopics: () => call<{ topics: RagTopic[] }>('list_topics'),

  setDocumentActive: (documentId: string, isActive: boolean) =>
    call<{ ok: true }>('set_document_active', { documentId, isActive }),

  retrievalStats: (days = 7) =>
    call<RagRetrievalStats>('retrieval_stats', { days }),

  /**
   * Upload = signed URL from rag-admin → direct PUT to storage → ingest via
   * rag-admin. The service-role key never leaves the edge runtime.
   */
  async uploadAndIngest(
    file: File,
    meta: RagIngestMeta,
    onStage?: (stage: RagUploadStage) => void
  ): Promise<RagIngestResult> {
    onStage?.('signing');
    const { storagePath, token } = await call<{
      storagePath: string;
      token: string;
    }>('create_upload', {
      sourceCode: meta.sourceCode,
      fileName: file.name,
      topicCodes: meta.topicCodes,
      title: meta.title,
      docVersion: meta.docVersion,
      language: meta.language,
    });

    onStage?.('uploading');
    const { error } = await supabase.storage
      .from('rag-documents')
      .uploadToSignedUrl(storagePath, token, file, {
        contentType: file.type || 'application/pdf',
      });
    if (error) throw new Error(`Upload failed: ${error.message}`);

    onStage?.('ingesting');
    // NOT `call`: a documented processing failure (SCANNED_OR_EMPTY_PDF…) comes
    // back as 200 with `error` + `processing_status: 'failed'` and must reach
    // the UI as a result, not an exception.
    return invoke<RagIngestResult>('ingest', { storagePath, ...meta });
  },
};

// ── Storage naming (client-side preview; the edge function is authoritative) ─
export function slugifyForStorage(v: string, max = 60): string {
  return v
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max);
}

/**
 * {source}/{primary-topic-dir}/{yyyy}/{title-slug}__v{ver}__{lang}__{yyyymmdd-hhmm}.{ext}
 * Mirrors buildStoragePath() in supabase/functions/rag-admin/index.ts.
 */
export function previewStoragePath(args: {
  sourceCode: string;
  topicDir: string;
  title: string;
  fileName: string;
  docVersion?: string;
  language?: string;
}): string {
  const ext = args.fileName.split('.').pop()?.toLowerCase() || 'pdf';
  const base =
    slugifyForStorage(args.title) ||
    slugifyForStorage(args.fileName.replace(/\.[^.]+$/, '')) ||
    'document';
  const ver = slugifyForStorage(args.docVersion ?? '', 12) || '1';
  const lang = slugifyForStorage(args.language ?? '', 8) || 'en';
  return `${args.sourceCode.toLowerCase()}/${args.topicDir}/${new Date().getUTCFullYear()}/${base}__v${ver}__${lang}__yyyymmdd-hhmm.${ext}`;
}

/** Rank topics whose aliases appear in a file name / title (for auto-suggest). */
export function suggestTopics(
  text: string,
  topics: RagTopic[],
  max = 3
): string[] {
  const hay = ` ${text.toLowerCase().replace(/[_\-.]+/g, ' ')} `;
  return topics
    .filter((t) => t.is_active && t.code !== 'general')
    .map((t) => ({
      code: t.code,
      hits: t.aliases.filter((a) => a && hay.includes(` ${a.toLowerCase()} `))
        .length,
    }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, max)
    .map((x) => x.code);
}
