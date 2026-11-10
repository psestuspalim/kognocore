import test from 'node:test';
import assert from 'node:assert/strict';
import { recordFailure, tooManyFailures } from '../api/_rate-limit.mjs';

const request = () => new Request('https://app.test/api/admin-login', { method: 'POST', headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' } });

test('rate limiter blocks at the limit, keys by client address and fails open', async () => {
  const originalFetch = globalThis.fetch;
  const keys = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const originalEnv = keys.map(key => process.env[key]);
  process.env.SUPABASE_URL = 'https://rate-test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  const calls = [];
  let failures = 0;
  let broken = false;
  globalThis.fetch = async (input, init) => {
    if (broken) return Response.json({ message: 'function not found' }, { status: 404 });
    const body = JSON.parse(init.body);
    calls.push(body);
    failures += body.p_increment;
    return Response.json(failures);
  };
  try {
    assert.equal(await tooManyFailures(request(), 'admin-login', 2), null);
    await recordFailure(request(), 'admin-login');
    await recordFailure(request(), 'admin-login');
    const blocked = await tooManyFailures(request(), 'admin-login', 2);
    assert.equal(blocked.status, 429);
    assert.equal(blocked.headers.get('retry-after'), '900');
    assert.ok(calls.every(call => call.p_key === calls[0].p_key && call.p_key.startsWith('admin-login:')));
    assert.ok(!calls[0].p_key.includes('203.0.113.7'));

    broken = true;
    assert.equal(await tooManyFailures(request(), 'admin-login', 2), null);
  } finally {
    globalThis.fetch = originalFetch;
    keys.forEach((key, index) => { if (originalEnv[index] === undefined) delete process.env[key]; else process.env[key] = originalEnv[index]; });
  }
});
