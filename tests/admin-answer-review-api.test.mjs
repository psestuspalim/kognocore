import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { PATCH, POST } from '../api/attempts.mjs';

test('review API requires admin, persists recalculation, detects conflicting writes and protects reviews', async () => {
  const originalFetch = globalThis.fetch;
  const keys = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'TOKEN_SIGNING_SECRET'];
  const originalEnv = keys.map(key => process.env[key]);
  process.env.SUPABASE_URL = 'https://review-test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  process.env.TOKEN_SIGNING_SECRET = 'test-signing-secret';
  const encoded = Buffer.from(JSON.stringify({ sub: 'admin', user: 'reviewer', exp: '2099-01-01T00:00:00Z' })).toString('base64url');
  const token = `adm.${encoded}.${crypto.createHmac('sha256', process.env.TOKEN_SIGNING_SECRET).update(encoded).digest('hex')}`;
  const original = { id: 'a', is_completed: true, score: 0, total_questions: 1, answer_log: [{ question: 'Q', selected_answer: 'A', is_correct: false }] };
  const review = { source: 'answer_log', index: 0, question: 'Q', selected_answer: 'A', expected_score: 0, reason: 'Equivalente' };
  let stored = original;
  let conflict = false;
  let writes = 0;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (init.method === 'PATCH') {
      writes++;
      assert.equal(url.searchParams.get('updated_date'), 'eq.2026-10-28T00:00:00Z');
      if (conflict) return Response.json([]);
      stored = JSON.parse(init.body).payload;
      return Response.json([{ id: 'a' }]);
    }
    assert.equal(init.method, 'GET');
    return Response.json({ id: 'a', payload: stored, updated_date: '2026-10-28T00:00:00Z' });
  };
  const request = (method, body, authenticated = true) => new Request('https://app.test/api/attempts', {
    method, headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body)
  });
  try {
    assert.equal((await PATCH(request('PATCH', { id: 'a', action: 'approve-answer', review }, false))).status, 401);
    assert.equal(writes, 0);
    const response = await PATCH(request('PATCH', { id: 'a', action: 'approve-answer', review }));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).attempt.score, 1);
    assert.equal(stored.admin_reviews[0].reviewer_email, 'reviewer@kognocore.local');
    assert.equal((await POST(request('POST', { attempt: original }))).status, 409);
    assert.equal(writes, 1);
    stored = original;
    conflict = true;
    assert.equal((await PATCH(request('PATCH', { id: 'a', action: 'approve-answer', review }))).status, 409);
    assert.equal(stored.score, 0);
  } finally {
    globalThis.fetch = originalFetch;
    keys.forEach((key, index) => { if (originalEnv[index] === undefined) delete process.env[key]; else process.env[key] = originalEnv[index]; });
  }
});
