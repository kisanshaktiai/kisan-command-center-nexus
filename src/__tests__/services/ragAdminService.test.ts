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