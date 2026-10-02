import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

function handler(rpc, env = {}) {
  const source = readFileSync(new URL('../api/_invite-redemption.mjs', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace('export async function', 'async function');
  const context = vm.createContext({
    crypto, Response, process: { env: {
      SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'server-only',
      CODE_PEPPER: 'test-pepper', TOKEN_SIGNING_SECRET: 'test-secret', ...env
    } },
    createClient: () => ({ rpc })
  });
  vm.runInContext(source, context);
  return (body, createSession = true) => context.consumeInviteRequest(
    new Request('https://example.test/api/redeem', { method: 'POST', body: JSON.stringify(body) }),
    { createSession }
  );
}

test('redeem returns only the token whose hash was committed with the invite use', async () => {
  let args;
  const expiresAt = '2026-10-03T12:00:00+00:00';
  const run = handler(async (name, parameters) => {
    assert.equal(name, 'consume_invite');
    args = parameters;
    return { data: { course_id: 'course-a', expires_at: expiresAt }, error: null };
  });
  const response = await run({ code: '  example_code  ' });
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(data.courseId, 'course-a');
  assert.equal(data.expiresAt, expiresAt);
  assert.equal(args.p_code, 'EXAMPLE_CODE');
  assert.equal(args.p_code_hash, crypto.createHash('sha256').update('EXAMPLE_CODE|test-pepper').digest('hex'));
  assert.equal(args.p_token_hash, crypto.createHash('sha256').update(data.token + '|test-pepper').digest('hex'));
  const [raw, signature] = data.token.split('.');
  assert.match(raw, /^[0-9a-f]{64}$/);
  assert.equal(signature, crypto.createHmac('sha256', 'test-secret').update(raw).digest('hex'));
});

test('database errors and rejected invitations never return a valid result or fallback token', async () => {
  for (const createSession of [true, false]) {
    for (const [result, status] of [
      [{ data: null, error: { message: 'insert failed' } }, 503],
      [{ data: null, error: null }, 401],
      [{ data: {}, error: null }, 503]
    ]) {
      const response = await handler(async () => result)({ code: 'EXAMPLE_CODE' }, createSession);
      assert.equal(response.status, status);
      const body = await response.json();
      assert.equal(body.token, undefined);
      assert.equal(body.valid, undefined);
    }
    const response = await handler(async () => { throw new Error('offline'); })({ code: 'EXAMPLE_CODE' }, createSession);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).token, undefined);
  }
});

test('legacy validation uses the same transaction without issuing or persisting a session', async () => {
  let calls = 0;
  const response = await handler(async (_name, args) => {
    calls++;
    assert.equal(args.p_code, 'CODE');
    assert.equal(args.p_token_hash, null);
    return { data: { course_id: 'course-a', expires_at: '2026-10-03T12:00:00Z' }, error: null };
  }, { TOKEN_SIGNING_SECRET: '' })({ code: ' code ' }, false);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { valid: true, courseId: 'course-a' });
  assert.equal(calls, 1);
});

test('bad input and missing server configuration cannot reach the database', async () => {
  const unreachable = () => { assert.fail('RPC must not run'); };
  for (const body of [null, {}, { code: 123 }, { code: '   ' }, { code: 'short' }, { code: 'x'.repeat(257) }]) {
    assert.equal((await handler(unreachable)(body)).status, 400);
  }
  for (const name of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CODE_PEPPER', 'TOKEN_SIGNING_SECRET']) {
    assert.equal((await handler(unreachable, { [name]: '' })({ code: 'EXAMPLE_CODE' })).status, 503);
  }
});
