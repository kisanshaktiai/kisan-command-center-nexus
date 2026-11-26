import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), upload: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: mocks.invoke },
    storage: { from: () => ({ uploadToSignedUrl: mocks.upload }) },
  },
}));
import { ragAdminService } from '@/services/ragAdminService';

describe('RAG upload failure recovery', () => {
  beforeEach(() => vi.clearAllMocks());

  it('surfaces compute exhaustion without retrying a write through the fallback', async () => {
    mocks.invoke.mockResolvedValue({
      data: null,
      error: { context: new Response(JSON.stringify({ code: 'WORKER_RESOURCE_LIMIT', message: 'Function failed' }), { status: 546 }) },
    });
    await expect(ragAdminService.upsertSource({ source_code: 'TEST_SOURCE', publisher: 'Test', authority_tier: 'icar', doc_type: 'faq' }))
      .rejects.toThrow('compute limit');
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(mocks.invoke.mock.calls[0][0]).toBe('rag-admin');
  });

  it('returns a registered processing failure rather than treating it as success', async () => {
    const failure = { documentId: 'a9da73e5-0a93-41da-aa92-f3b12ff496ad', processing_status: 'failed', error: 'WORKER_RESOURCE_LIMIT', upstream_status: 546 };
    mocks.invoke.mockResolvedValueOnce({ data: { storagePath: 'source/test.pdf', token: 'signed-upload-test' }, error: null })
      .mockResolvedValueOnce({ data: failure, error: null });
    mocks.upload.mockResolvedValue({ error: null });
    const result = await ragAdminService.uploadAndIngest({ name: 'test.pdf', type: 'application/pdf' } as File, { sourceCode: 'TEST_SOURCE', title: 'Test', topicCodes: ['seeds'] });
    expect(result.processing_status).toBe('failed');
    expect(result.upstream_status).toBe(546);
    expect(mocks.upload).toHaveBeenCalledTimes(1);
    expect(mocks.invoke).toHaveBeenCalledTimes(2);
  });
});

describe('RAG OCR processing', () => {
  beforeEach(() => vi.clearAllMocks());
  const upload = { data: { storagePath: 'source/scan.pdf', token: 'signed-upload-test' }, error: null };
  const ocr = (pending: number, extra = {}) => ({ total: 20, text_pages: 0, ocr_pages: 20 - pending, pending, empty: 0, low_confidence: 0, failed: 0, avg_confidence: 0.9, ...extra });
  const scan = { name: 'scan.pdf', type: 'application/pdf' } as File;
  const meta = { sourceCode: 'TEST_SOURCE', title: 'Scan', topicCodes: ['seeds'], embed: true };

  it('keeps asking for OCR rounds until the document leaves parsing, reporting page progress', async () => {
    mocks.upload.mockResolvedValue({ error: null });
    mocks.invoke.mockResolvedValueOnce(upload)
      .mockResolvedValueOnce({ data: { documentId: 'doc-1', processing_status: 'parsing', ocr: ocr(12) }, error: null })
      .mockResolvedValueOnce({ data: { documentId: 'doc-1', processing_status: 'parsing', ocr: ocr(4) }, error: null })
      .mockResolvedValueOnce({ data: { documentId: 'doc-1', processing_status: 'completed', chunks: 31, pages: 20, ocr: ocr(0) }, error: null });
    const stages: string[] = [];
    const result = await ragAdminService.uploadAndIngest(scan, meta, (stage, progress) => stages.push(progress ? `${stage}:${progress.pending}` : stage));
    expect(result.processing_status).toBe('completed');
    expect(result.chunks).toBe(31);
    expect(stages).toEqual(['signing', 'uploading', 'ingesting', 'ocr:12', 'ocr:4', 'ocr:0']);
    expect(mocks.invoke.mock.calls.slice(2).map((c) => c[1].body.action)).toEqual(['ocr_continue', 'ocr_continue']);
    expect(mocks.invoke.mock.calls[2][1].body).toMatchObject({ documentId: 'doc-1', embed: true });
    expect(mocks.upload).toHaveBeenCalledTimes(1);
  });

  it('does not start OCR rounds for a digital document', async () => {
    mocks.upload.mockResolvedValue({ error: null });
    mocks.invoke.mockResolvedValueOnce(upload)
      .mockResolvedValueOnce({ data: { documentId: 'doc-2', processing_status: 'completed', chunks: 5, pages: 2 }, error: null });
    const result = await ragAdminService.uploadAndIngest(scan, meta);
    expect(result.processing_status).toBe('completed');
    expect(mocks.invoke).toHaveBeenCalledTimes(2);
  });

  it('stops after repeated rounds without progress and returns the still-parsing state with the engine error', async () => {
    mocks.upload.mockResolvedValue({ error: null });
    const stuck = { data: { documentId: 'doc-3', processing_status: 'parsing', ocr: ocr(20), ocr_error: 'OCR_HTTP_401' }, error: null };
    mocks.invoke.mockResolvedValueOnce(upload).mockResolvedValue(stuck);
    const result = await ragAdminService.uploadAndIngest(scan, meta);
    expect(result.processing_status).toBe('parsing');
    expect(result.ocr_error).toBe('OCR_HTTP_401');
    expect(mocks.invoke).toHaveBeenCalledTimes(2 + 3);
  });

  it('returns a failed OCR document as a result, not as success', async () => {
    mocks.upload.mockResolvedValue({ error: null });
    mocks.invoke.mockResolvedValueOnce(upload)
      .mockResolvedValueOnce({ data: { documentId: 'doc-4', processing_status: 'parsing', ocr: ocr(1, { total: 1, ocr_pages: 0 }) }, error: null })
      .mockResolvedValueOnce({ data: { documentId: 'doc-4', processing_status: 'failed', error: 'OCR_NO_TEXT: no readable text on any of 1 page(s).' }, error: null });
    const result = await ragAdminService.uploadAndIngest({ name: 'photo.jpg', type: 'image/jpeg' } as File, meta);
    expect(result.processing_status).toBe('failed');
    expect(result.error).toContain('OCR_NO_TEXT');
  });

  it('sends retry only on the first round when retrying failed pages', async () => {
    mocks.invoke
      .mockResolvedValueOnce({ data: { documentId: 'doc-5', processing_status: 'parsing', ocr: ocr(2) }, error: null })
      .mockResolvedValueOnce({ data: { documentId: 'doc-5', processing_status: 'completed', chunks: 9, ocr: ocr(0) }, error: null });
    await ragAdminService.runOcrToCompletion({ documentId: 'doc-5', processing_status: 'parsing' } as never, { retry: true, embed: true });
    expect(mocks.invoke.mock.calls.map((c) => c[1].body.retry)).toEqual([true, false]);
  });

  it('uploads an image with its own content type', async () => {
    mocks.upload.mockResolvedValue({ error: null });
    mocks.invoke.mockResolvedValueOnce(upload)
      .mockResolvedValueOnce({ data: { documentId: 'doc-6', processing_status: 'completed', chunks: 1, pages: 1 }, error: null });
    await ragAdminService.uploadAndIngest({ name: 'label.png', type: 'image/png' } as File, meta);
    expect(mocks.upload.mock.calls[0][3]).toEqual({ contentType: 'image/png' });
  });
});
