import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  ragAdminService,
  type RagIngestMeta,
  type RagIngestResult,
  type RagOcrProgress,
  type RagSourceInput,
  type RagUploadStage,
} from '@/services/ragAdminService';

export const ragQueryKeys = {
  sources: ['rag-admin', 'sources'] as const,
  documents: (filters: {
    sourceCode?: string;
    status?: string;
    topicCode?: string;
  }) => ['rag-admin', 'documents', filters] as const,
  stats: (days: number) => ['rag-admin', 'retrieval-stats', days] as const,
  topics: ['rag-admin', 'lookup', 'topics'] as const,
  states: ['rag-admin', 'lookup', 'states'] as const,
  crops: ['rag-admin', 'lookup', 'crops'] as const,
  tenants: ['rag-admin', 'lookup', 'tenants'] as const,
};

// ── Sources ─────────────────────────────────────────────────────────────────
export function useRagSources() {
  return useQuery({
    queryKey: ragQueryKeys.sources,
    queryFn: () => ragAdminService.listSources(),
  });
}

export function useUpsertRagSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (source: RagSourceInput) =>
      ragAdminService.upsertSource(source),
    onSuccess: (d) => {
      toast.success(`Source ${d?.source?.source_code ?? ''} saved`);
      qc.invalidateQueries({ queryKey: ragQueryKeys.sources });
    },
    onError: (e: Error) => toast.error(e.message ?? 'Failed to save source'),
  });
}

// ── Documents ───────────────────────────────────────────────────────────────
export function useRagDocuments(
  filters: { sourceCode?: string; status?: string; topicCode?: string } = {}
) {
  return useQuery({
    queryKey: ragQueryKeys.documents(filters),
    queryFn: () => ragAdminService.listDocuments(filters),
  });
}

export function useSetRagDocumentActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { documentId: string; isActive: boolean }) =>
      ragAdminService.setDocumentActive(vars.documentId, vars.isActive),
    onSuccess: (_d, vars) => {
      toast.success(
        vars.isActive
          ? 'Document enabled for retrieval'
          : 'Document hidden from retrieval'
      );
      qc.invalidateQueries({ queryKey: ['rag-admin', 'documents'] });
      qc.invalidateQueries({ queryKey: ragQueryKeys.sources });
    },
    onError: (e: Error) => toast.error(e.message ?? 'Update failed'),
  });
}

export function useBackfillRagEmbeddings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) =>
      ragAdminService.backfillEmbeddings(documentId),
    onSuccess: (r) => {
      if (r.embedded > 0) {
        toast.success(
          `Embedded ${r.embedded} chunk${r.embedded === 1 ? '' : 's'}`
        );
      } else {
        toast.info(r.message ?? 'Nothing to embed');
      }
      qc.invalidateQueries({ queryKey: ['rag-admin', 'documents'] });
    },
    onError: (e: Error) => toast.error(e.message ?? 'Re-embed failed'),
  });
}

// ── Retrieval stats ─────────────────────────────────────────────────────────
export function useRagRetrievalStats(days = 7) {
  return useQuery({
    queryKey: ragQueryKeys.stats(days),
    queryFn: () => ragAdminService.retrievalStats(days),
    refetchInterval: 60_000,
  });
}

// ── Upload + ingest (stage-aware) ───────────────────────────────────────────
export function useRagUploadAndIngest() {
  const qc = useQueryClient();
  const [stage, setStage] = useState<RagUploadStage | null>(null);
  const [ocrProgress, setOcrProgress] = useState<RagOcrProgress | null>(null);

  const mutation = useMutation({
    mutationFn: (vars: { file: File; meta: RagIngestMeta }) => {
      setOcrProgress(null);
      return ragAdminService.uploadAndIngest(vars.file, vars.meta, (s, ocr) => {
        setStage(s);
        if (ocr) setOcrProgress(ocr);
      });
    },
    onSuccess: (r: RagIngestResult) => {
      if (r.processing_status === 'failed' || r.error) {
        toast.warning(
          'Document stored, but processing failed — see result card'
        );
      } else if (r.processing_status === 'parsing') {
        toast.warning(
          'OCR is not finished — resume it from the documents list'
        );
      } else if (r.processing_error) {
        toast.warning('Ingested, but some pages could not be read — see result card');
      } else if (r.deduplicated) {
        toast.info('Identical file already ingested — categories merged');
      } else {
        toast.success(`Ingested: ${r.chunks} chunks from ${r.pages} pages`);
      }
      qc.invalidateQueries({ queryKey: ['rag-admin', 'documents'] });
      qc.invalidateQueries({ queryKey: ragQueryKeys.sources });
    },
    onError: (e: Error) => toast.error(e.message ?? 'Upload failed'),
    onSettled: () => setStage(null),
  });

  return { ...mutation, stage, ocrProgress };
}

/** Resume OCR for a document still in 'parsing', or retry its failed pages. */
export function useResumeRagOcr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { documentId: string; retry?: boolean }) =>
      ragAdminService.runOcrToCompletion(
        {
          documentId: vars.documentId,
          processing_status: 'parsing',
        } as RagIngestResult,
        { retry: vars.retry, embed: true }
      ),
    onSuccess: (r) => {
      if (r.processing_status === 'completed') {
        toast.success(
          r.processing_error
            ? 'OCR finished — some pages could not be read'
            : `OCR finished: ${r.chunks} chunks indexed`
        );
      } else if (r.processing_status === 'failed' || r.error) {
        toast.error(r.error ?? r.processing_error ?? 'OCR failed');
      } else {
        toast.warning(r.ocr_error ?? 'OCR is still pending — try again later');
      }
      qc.invalidateQueries({ queryKey: ['rag-admin', 'documents'] });
      qc.invalidateQueries({ queryKey: ragQueryKeys.sources });
    },
    onError: (e: Error) => toast.error(e.message ?? 'OCR resume failed'),
  });
}

// ── SSOT lookups (read-only tables, RLS allows authenticated SELECT) ────────
export function useRagTopicsLookup() {
  return useQuery({
    queryKey: ragQueryKeys.topics,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { topics } = await ragAdminService.listTopics();
      return topics.filter((t) => t.is_active);
    },
  });
}

export interface StateOption {
  code: string;
  name: string;
}
export function useRagStatesLookup() {
  return useQuery({
    queryKey: ragQueryKeys.states,
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<StateOption[]> => {
      const { data, error } = await supabase
        .from('states')
        .select('code, name')
        .not('code', 'is', null)
        .order('name');
      if (error) throw error;
      return (data || [])
        .filter((s) => !!s.code)
        .map((s) => ({ code: s.code as string, name: s.name }));
    },
  });
}

export interface CropOption {
  value: string;
  label: string;
}
export function useRagCropsLookup() {
  return useQuery({
    queryKey: ragQueryKeys.crops,
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<CropOption[]> => {
      const { data, error } = await supabase
        .from('crops')
        .select('value, label, is_active, display_order')
        .order('display_order');
      if (error) throw error;
      return (data || [])
        .filter((c) => c.is_active !== false)
        .map((c) => ({ value: c.value, label: c.label }));
    },
  });
}

export interface TenantOption {
  id: string;
  name: string;
  slug: string;
}
export function useRagTenantsLookup() {
  return useQuery({
    queryKey: ragQueryKeys.tenants,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<TenantOption[]> => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, slug')
        .order('name');
      if (error) throw error;
      return (data || []) as TenantOption[];
    },
  });
}
