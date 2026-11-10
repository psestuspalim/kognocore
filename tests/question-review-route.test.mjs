import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { GET } from '../api/quizzes.mjs';

// Guards the wiring that a refactor once dropped: the review inbox is served
// through /api/quizzes?resource=question-reviews and needs a route in the app.
test('question reviews are reachable through the quizzes endpoint', async () => {
  const originalFetch = globalThis.fetch;
  const keys = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'TOKEN_SIGNING_SECRET'];
  const originalEnv = keys.map(key => process.env[key]);
  process.env.SUPABASE_URL = 'https://review-route-test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  process.env.TOKEN_SIGNING_SECRET = 'test-signing-secret';
  const encoded = Buffer.from(JSON.stringify({ sub: 'admin', user: 'reviewer', exp: '2099-01-01T00:00:00Z' })).toString('base64url');
  const token = `adm.${encoded}.${crypto.createHmac('sha256', process.env.TOKEN_SIGNING_SECRET).update(encoded).digest('hex')}`;
  const question = { id: 'q1', question: 'Q', answerOptions: [{ id: '0', text: 'A', isCorrect: true }] };
  globalThis.fetch = async () => Response.json([{ id: 'quiz1', payload: {
    title: 'Quiz', questions: [question],
    question_reviews: [{ id: 'r1', question, reason: 'Errata', reporter: 'x', status: 'pending', created_at: '2026-11-01T00:00:00Z' }]
  } }]);
  try {
    const request = new Request('https://app.test/api/quizzes?resource=question-reviews', { headers: { Authorization: `Bearer ${token}` } });
    const response = await GET(request);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.reviews?.length, 1);
    assert.equal(body.reviews[0].quiz_id, 'quiz1');

    const tampered = new Request(request.url, { headers: { Authorization: `Bearer ${token.slice(0, -1)}${token.endsWith('0') ? '1' : '0'}` } });
    assert.notEqual((await GET(tampered)).status, 200);
  } finally {
    globalThis.fetch = originalFetch;
    keys.forEach((key, index) => { if (originalEnv[index] === undefined) delete process.env[key]; else process.env[key] = originalEnv[index]; });
  }
});

test('the review inbox and the report button stay wired into the app', async () => {
  const read = path => readFile(new URL(path, import.meta.url), 'utf8');
  assert.match(await read('../src/App.jsx'), /path="\/AdminQuestionReviews"/);
  assert.match(await read('../src/components/admin/adminNavigation.js'), /AdminQuestionReviews/);
  assert.match(await read('../src/pages/Quizzes.jsx'), /<ReportQuestionButton/);
});
