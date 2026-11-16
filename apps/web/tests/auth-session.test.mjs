import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'vite';

test('session restoration after reload deduplicates refresh and clears expired state', async () => {
  const vite = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
  });
  const originalFetch = globalThis.fetch;
  const account = {
    id: 'member-1',
    email: 'member@example.test',
    username: 'member',
    role: 'MEMBER',
    status: 'ACTIVE',
    emailVerified: true,
  };
  let calls = 0;
  globalThis.fetch = async (path, options) => {
    assert.equal(path, '/api/v1/auth/refresh');
    assert.equal(options.credentials, 'same-origin');
    calls += 1;
    return new globalThis.Response(
      JSON.stringify({ data: { accessToken: 'new-access', user: account } }),
      { status: 200 },
    );
  };
  try {
    const auth = await vite.ssrLoadModule('/src/auth/auth-api.ts');
    const [first, second] = await Promise.all([
      auth.restoreSession(),
      auth.restoreSession(),
    ]);
    assert.deepEqual(first, account);
    assert.deepEqual(second, account);
    assert.equal(calls, 1);
    globalThis.fetch = async () =>
      new globalThis.Response('{}', { status: 401 });
    assert.equal(await auth.restoreSession(), null);
  } finally {
    globalThis.fetch = originalFetch;
    await vite.close();
  }
});
