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