import { handleRagAdmin } from '../_shared/ragAdmin.ts';

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

for (const registered of [true, false]) {
  Deno.test(`CPU exhaustion ${registered ? 'recovers the interrupted document' : 'does not claim an unregistered document was recovered'}`, async () => {
    const originalFetch = globalThis.fetch;
    const names = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
    const previous = names.map((name) => Deno.env.get(name));
    names.forEach((name, i) => Deno.env.set(name, i === 0 ? 'https://rag-test.invalid' : 'test-key'));
    let recoverySeen = false;
    globalThis.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
      if (url.pathname === '/auth/v1/user') return reply({ id: '00000000-0000-4000-8000-000000000001', email: 'test@example.invalid' });
      if (url.pathname.endsWith('/rpc/is_super_admin')) return reply(true);
      if (url.pathname.endsWith('/rag_topics')) return reply([{ code: 'seeds', storage_dir: 'seeds', is_active: true }]);
      if (url.pathname === '/functions/v1/rag-ingest') return reply({ code: 'WORKER_RESOURCE_LIMIT', message: 'CPU Time exceeded' }, 546);
      if (url.pathname.endsWith('/rag_documents') && init?.method === 'PATCH' && url.searchParams.has('file_url')) {
        assert(url.searchParams.get('file_url') === 'eq.rag-documents/source/seeds/test.pdf', 'Recovery must target the exact uploaded file');
        assert(url.searchParams.get('processing_status') === 'in.(pending,processing,parsing,chunking,embedding)', 'Recovery must not overwrite completed or failed documents');
        assert(JSON.parse(String(init.body)).processing_status === 'failed', 'Interrupted status must become failed');
        recoverySeen = true;
        return reply(registered ? [{ id: '00000000-0000-4000-8000-000000000002' }] : []);
      }
      if (url.pathname.endsWith('/rag_documents') || url.pathname.endsWith('/rag_chunks') || url.pathname.endsWith('/admin_audit_logs')) return reply([]);
      throw new Error(`Unexpected request: ${url.pathname}`);
    };
    try {
      const response = await handleRagAdmin(new Request('https://rag-test.invalid/functions/v1/rag-admin', {
        method: 'POST', headers: { Authorization: 'Bearer test-session', 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ingest', storagePath: 'source/seeds/test.pdf', sourceCode: 'TEST_SOURCE', title: 'Test', topicCodes: ['seeds'] }),
      }));
      const body = await response.json();
      assert(recoverySeen, 'Recovery update must run');
      assert(response.status === (registered ? 200 : 503), 'Response must distinguish recorded failure from upstream outage');
      assert(body.processing_status === 'failed' && body.upstream_status === 546, 'Original failure must be preserved');
      assert(Boolean(body.documentId) === registered, 'Only an actually recovered document may be identified');
    } finally {
      globalThis.fetch = originalFetch;
      names.forEach((name, i) => previous[i] === undefined ? Deno.env.delete(name) : Deno.env.set(name, previous[i] ?? ''));
    }
  });
}

// ── OCR (2026-11-26) ─────────────────────────────────────────────────────────
async function withAdmin(handler: (url: URL, init?: RequestInit) => Response | undefined, run: () => Promise<void>) {
  const originalFetch = globalThis.fetch;
  const names = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
  const previous = names.map((name) => Deno.env.get(name));
  names.forEach((name, i) => Deno.env.set(name, i === 0 ? 'https://rag-test.invalid' : 'test-key'));
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.pathname === '/auth/v1/user') return reply({ id: '00000000-0000-4000-8000-000000000001', email: 'test@example.invalid' });
    if (url.pathname.endsWith('/rpc/is_super_admin')) return reply(true);
    const custom = handler(url, init);
    if (custom) return custom;
    if (url.pathname.endsWith('/admin_audit_logs')) return reply([]);
    throw new Error(`Unexpected request: ${url.pathname}`);
  };
  try { await run(); } finally {
    globalThis.fetch = originalFetch;
    names.forEach((name, i) => previous[i] === undefined ? Deno.env.delete(name) : Deno.env.set(name, previous[i] ?? ''));
  }
}
const adminCall = (body: unknown) => handleRagAdmin(new Request('https://rag-test.invalid/functions/v1/rag-admin', {
  method: 'POST', headers: { Authorization: 'Bearer test-session', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}));
const jsonReply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.test('ocr_continue relays to rag-ingest with the service key and returns its progress', async () => {
  let relayed: Record<string, unknown> | null = null;
  let auth = '';
  await withAdmin((url, init) => {
    if (url.pathname === '/functions/v1/rag-ingest') {
      relayed = JSON.parse(String(init?.body));
      auth = new Headers(init?.headers).get('Authorization') ?? '';
      return jsonReply({ documentId: 'doc-1', processing_status: 'parsing', ocr: { total: 10, pending: 4 } });
    }
  }, async () => {
    const res = await adminCall({ action: 'ocr_continue', documentId: 'doc-1', retry: true });
    const body = await res.json();
    assert(res.status === 200, 'progress is a normal response');
    assert(body.processing_status === 'parsing' && body.ocr.pending === 4, 'progress relayed unchanged');
    assert(relayed?.action === 'ocr_continue' && relayed?.documentId === 'doc-1' && relayed?.retry === true && relayed?.embed === true, 'relay payload');
    assert(auth === 'Bearer test-key', 'rag-ingest is called with the service role key, never the caller token');
  });
});

Deno.test('ocr_continue reports a killed worker as resumable, not as a failure', async () => {
  await withAdmin((url) => {
    if (url.pathname === '/functions/v1/rag-ingest') return jsonReply({ code: 'WORKER_RESOURCE_LIMIT', message: 'CPU Time exceeded' }, 546);
  }, async () => {
    const res = await adminCall({ action: 'ocr_continue', documentId: 'doc-1' });
    const body = await res.json();
    assert(res.status === 200 && body.processing_status === 'parsing', 'still parsing');
    assert(String(body.ocr_error).includes('WORKER_RESOURCE_LIMIT') && body.upstream_status === 546, 'cause preserved');
  });
});

Deno.test('ocr_continue relays a failed document (no readable text) with its reason', async () => {
  await withAdmin((url) => {
    if (url.pathname === '/functions/v1/rag-ingest') return jsonReply({ documentId: 'doc-1', processing_status: 'failed', error: 'OCR_NO_TEXT: no readable text on any of 3 page(s).' }, 422);
  }, async () => {
    const res = await adminCall({ action: 'ocr_continue', documentId: 'doc-1' });
    const body = await res.json();
    assert(res.status === 200 && body.processing_status === 'failed' && String(body.error).startsWith('OCR_NO_TEXT'), 'documented failure reaches the panel as a result');
  });
});

for (const [fileName, accepted] of [['scan.pdf', true], ['label.PNG', true], ['photo.jpeg', true], ['plate.tiff', true], ['notes.md', false], ['notes.txt', false], ['tool.exe', false]] as const) {
  Deno.test(`create_upload ${accepted ? 'accepts' : 'refuses'} ${fileName}`, async () => {
    await withAdmin((url) => {
      if (url.pathname.endsWith('/rag_source_registry')) return jsonReply({ id: 's1', is_active: true });
      if (url.pathname.endsWith('/rag_topics')) return jsonReply([{ code: 'seeds', storage_dir: 'seeds', is_active: true }]);
      if (url.pathname.includes('/storage/v1/object/upload/sign/')) return jsonReply({ url: '/object/upload/sign/rag-documents/x?token=t' });
    }, async () => {
      const res = await adminCall({ action: 'create_upload', sourceCode: 'TEST_SOURCE', fileName, topicCodes: ['seeds'] });
      assert((res.status === 200) === accepted, `${fileName}: status ${res.status}`);
    });
  });
}

Deno.test('list_documents attaches OCR progress per document and none for digital documents', async () => {
  await withAdmin((url) => {
    if (url.pathname.endsWith('/rag_documents')) return jsonReply([{ id: 'scan-doc', title: 'Scan' }, { id: 'digital-doc', title: 'Digital' }]);
    if (url.pathname.endsWith('/rag_pages')) {
      assert(url.searchParams.get('document_id') === 'in.(scan-doc,digital-doc)', 'pages are read only for the listed documents');
      return jsonReply([
        { document_id: 'scan-doc', status: 'done', extraction_method: 'text', ocr_confidence: null },
        { document_id: 'scan-doc', status: 'done', extraction_method: 'ocr', ocr_confidence: 0.9 },
        { document_id: 'scan-doc', status: 'done', extraction_method: 'ocr', ocr_confidence: 0.8 },
        { document_id: 'scan-doc', status: 'pending', extraction_method: null, ocr_confidence: null },
        { document_id: 'scan-doc', status: 'failed', extraction_method: null, ocr_confidence: null },
        { document_id: 'scan-doc', status: 'low_confidence', extraction_method: 'ocr', ocr_confidence: 0.2 },
      ]);
    }
  }, async () => {
    const res = await adminCall({ action: 'list_documents' });
    const { documents } = await res.json();
    const scan = documents.find((d: { id: string }) => d.id === 'scan-doc').ocr;
    assert(scan.total === 6 && scan.text_pages === 1 && scan.ocr_pages === 2 && scan.pending === 1 && scan.failed === 1 && scan.low_confidence === 1, `counts ${JSON.stringify(scan)}`);
    assert(scan.avg_confidence === 0.85, 'average over indexed OCR pages only');
    assert(documents.find((d: { id: string }) => d.id === 'digital-doc').ocr === null, 'digital document has no OCR block');
  });
});

