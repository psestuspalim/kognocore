import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import { applyQuestionCorrections, applySessionCorrections, matchesQuestion, questionIdentity } from '../src/lib/question-review.js';
import { normalizeQuizQuestion, validateNormalizedQuiz } from '../src/lib/quiz-normalization.js';
import { changeQuiz, readQuiz, regradeQuizAttempts } from '../api/_question-review.mjs';
import { canAccessCourse } from '../api/_students.mjs';
import { summarizeQuizProgress } from '../src/lib/quiz-progress.js';

const before = { questionId: 'q1', type: 'multiple-choice', question: 'Texto mal parseado', answerOptions: [
  { id: 'a', text: 'Uno', isCorrect: true }, { id: 'b', text: 'Dos', isCorrect: false }
] };
const after = { ...before, question: 'Texto corregido', feedback: 'Explicación corregida', answerOptions: [
  { id: 'a', text: 'Primera opción', isCorrect: false }, { id: 'b', text: 'Segunda opción', isCorrect: true }
] };
const quiz = { id: 'quiz', title: 'Quiz', course_id: 'course', questions: [after], review_revision: 1,
  question_corrections: [{ before, after, revision: 1, created_at: '2026-09-27T12:00:00Z' }] };
const answer = { question_id: 'q1', question: before.question, selected_option_id: 'b', selected_answer: 'Dos', is_correct: false, response_time: 8 };
const attempt = { id: 'attempt', quiz_id: 'quiz', score: 0, answered_questions: 1, total_questions: 2,
  is_completed: false, answer_log: [answer], wrong_questions: [answer], response_times: [8],
  quiz_snapshot: { questions: [{ ...before, answerOptions: [...before.answerOptions].reverse() }] } };

test('correction regrades shuffled options and updates errors without changing completion or progress', () => {
  const original = structuredClone(attempt);
  const result = applyQuestionCorrections(attempt, quiz);
  assert.equal(result.score, 1);
  assert.equal(result.wrong_questions.length, 0);
  assert.equal(result.answer_log[0].selected_answer, 'Dos');
  assert.equal(result.answer_log[0].correct_answer, 'Segunda opción');
  assert.equal(result.answer_log[0].original_is_correct, false);
  assert.equal(result.answer_log[0].question, after.question);
  assert.deepEqual(result.quiz_snapshot.questions[0].answerOptions.map(o => o.id), ['b', 'a']);
  assert.equal(result.quiz_snapshot.questions[0].answerOptions[0].isCorrect, true);
  assert.equal(result.answered_questions, 1);
  assert.equal(result.is_completed, false);
  assert.deepEqual(result.response_times, [8]);
  assert.equal(summarizeQuizProgress(quiz, [result]).percent, 50);
  assert.equal(applyQuestionCorrections(result, quiz), result);
  assert.deepEqual(attempt, original);
});

test('formerly correct answers become wrong, multiple corrections remain idempotent', () => {
  const reversal = { ...quiz, review_revision: 2, question_corrections: [
    ...quiz.question_corrections, { before: after, after: before, revision: 2, created_at: '2026-09-27T13:00:00Z' }
  ] };
  const result = applyQuestionCorrections(applyQuestionCorrections(attempt, quiz), reversal);
  assert.equal(result.score, 0);
  assert.equal(result.wrong_questions.length, 1);
  assert.equal(result.answer_log[0].original_is_correct, false);
  assert.equal(applyQuestionCorrections(result, reversal).score, 0);
});

test('legacy text matching is conservative, and unknown responses keep their original grade', () => {
  const legacy = { ...attempt, answer_log: undefined, wrong_questions: [{ ...answer, question_id: undefined, selected_option_id: undefined }] };
  const revised = applyQuestionCorrections(legacy, quiz);
  assert.equal(revised.score, 1);
  assert.equal(revised.answer_log[0].is_correct, true);
  const unknown = applyQuestionCorrections({ ...attempt, answer_log: [{ ...answer, selected_option_id: undefined, selected_answer: 'Respuesta registrada' }] }, quiz);
  assert.equal(unknown.score, 0);
  assert.equal(unknown.review_ungradable_count, 1);
  assert.equal(unknown.answer_log[0].review_ungradable, true);
  assert.equal(matchesQuestion({ question_id: 'other', question: before.question }, before), false);
});

test('saved sessions reflect corrections and retain position, identity and selected options', () => {
  const session = { quizId: 'quiz', attemptId: 'attempt', currentQuestionIndex: 0, score: 0,
    answerLog: [answer], wrongAnswers: [answer], lightweightQuiz: attempt.quiz_snapshot, markedQuestions: ['q1'] };
  const revised = applySessionCorrections(session, quiz);
  assert.equal(revised.score, 1);
  assert.equal(revised.currentQuestionIndex, 0);
  assert.equal(revised.attemptId, 'attempt');
  assert.deepEqual(revised.markedQuestions, ['q1']);
  assert.equal(revised.correctAnswers.length, 1);
  assert.equal(revised.lightweightQuiz.review_revision, 1);
  assert.equal(applySessionCorrections(revised, quiz).score, 1);
});

test('open-ended corrections reuse the real grading engine and preserve student input', () => {
  const q = normalizeQuizQuestion({ id: 'open', tipo: 'respuesta_corta', prompt: 'Color', respuesta: { canonico: 'rojo' } });
  const corrected = { ...q, respuesta: { canonico: 'azul' } };
  const source = { ...attempt, answer_log: [{ question_id: 'open', question: 'Color', inputs: { text: 'azul' }, is_correct: false }] };
  const result = applyQuestionCorrections(source, { question_corrections: [{ before: q, after: corrected, revision: 1 }] });
  assert.equal(result.score, 1);
  assert.equal(result.answer_log[0].result.correcto, true);
  assert.deepEqual(result.answer_log[0].inputs, { text: 'azul' });
});

test('swipe and multiple-selection attempts are regraded using the actual selected option IDs', () => {
  const swipe = { ...attempt, answer_log: [{ ...answer, swipe_answer: true }] };
  assert.equal(applyQuestionCorrections(swipe, quiz).score, 1);
  assert.equal(applyQuestionCorrections(swipe, quiz).answer_log[0].correct_answer, 'Verdadero');
  const multiple = { ...attempt, answer_log: [{ ...answer, selected_option_ids: ['a', 'b'] }] };
  const multiQuiz = { question_corrections: [{ before, after: { ...after, answerOptions: after.answerOptions.map(o => ({ ...o, isCorrect: true })) }, revision: 1 }] };
  assert.equal(applyQuestionCorrections(multiple, multiQuiz).score, 1);
});

// An in-memory PostgREST adapter exercises pagination and compare-and-swap behavior.
function database(quizzes, attempts = []) {
  const tables = { quizzes: structuredClone(quizzes), quiz_attempts: structuredClone(attempts) };
  let conflicts = 0;
  return {
    tables, conflictOnce() { conflicts++; },
    from(table) {
      let conditions = [], update, start = 0, end = Infinity, single = false;
      const value = (row, key) => key.startsWith('payload->>') ? row.payload[key.slice(10)] : row[key];
      const builder = {
        select() { return builder; }, order() { return builder; },
        eq(key, expected) { conditions.push(row => value(row, key) === expected); return builder; },
        is(key, expected) { conditions.push(row => (value(row, key) ?? null) === expected); return builder; },
        range(a, b) { start = a; end = b; return builder; },
        update(patch) { update = patch; return builder; },
        maybeSingle() { single = true; return builder; },
        then(resolve, reject) {
          let rows = tables[table].filter(row => conditions.every(fn => fn(row))).slice(start, end + 1);
          if (update && conflicts) { conflicts--; rows = []; }
          else if (update) rows.forEach(row => Object.assign(row, structuredClone(update)));
          return Promise.resolve({ data: structuredClone(single ? rows[0] || null : rows), error: null }).then(resolve, reject);
        }
      };
      return builder;
    }
  };
}

test('recalculation persists all pages, retries conflicts, and can safely resume', async () => {
  const db = database([], Array.from({ length: 205 }, (_, i) => ({
    id: String(i), payload: { ...attempt, id: String(i) }, updated_date: '2026-09-26T00:00:00Z'
  })));
  db.conflictOnce();
  const result = await regradeQuizAttempts(db, quiz);
  assert.equal(result.count, 205);
  assert.ok(db.tables.quiz_attempts.every(row => row.payload.score === 1 && row.payload.review_revision === 1));
  assert.equal((await regradeQuizAttempts(db, quiz)).count, 0);
});

async function apiHarness() {
  const db = database([{ id: 'quiz', payload: { ...quiz, questions: [before], review_revision: 0, question_corrections: [] }, updated_date: '2026-09-26T00:00:00Z' }],
    [{ id: 'attempt', payload: attempt, updated_date: '2026-09-26T00:00:00Z' }]);
  let role = 'student', course = 'course';
  const context = vm.createContext({
    Response, URL, randomUUID, matchesQuestion, questionIdentity, validateNormalizedQuiz, changeQuiz, readQuiz, regradeQuizAttempts, canAccessCourse,
    requireDataActor: async () => role === 'anonymous' ? { response: Response.json({}, { status: 401 }) }
      : { actor: { kind: role, learnerId: 'learner', courseIds: [course] }, supabase: db },
    requireAdmin: async () => role !== 'admin' ? { response: Response.json({}, { status: 403 }) }
      : { user: { id: 'admin' }, supabase: db }
  });
  const source = readFileSync(new URL('../api/_question-reviews.mjs', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/export async function/g, 'async function');
  const handlers = vm.runInContext(source + '\n({GET, POST, PATCH})', context);
  return { db, handlers, role: value => { role = value; }, course: value => { course = value; } };
}
const request = (method, body) => new Request('https://example.test/api/question-reviews', {
  method, ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {})
});

test('report workflow enforces access, deduplicates pending reports, corrects and persists grades', async () => {
  const app = await apiHarness();
  const body = { quiz_id: 'quiz', question: before, reason: 'Respuesta incorrecta' };
  app.role('anonymous');
  assert.equal((await app.handlers.POST(request('POST', body))).status, 401);
  app.role('student'); app.course('another-course');
  assert.equal((await app.handlers.POST(request('POST', body))).status, 403);
  app.course('course');
  assert.equal((await app.handlers.GET(request('GET'))).status, 403);
  assert.equal((await app.handlers.PATCH(request('PATCH', body))).status, 403);
  assert.equal((await app.handlers.POST(request('POST', body))).status, 200);
  assert.equal((await app.handlers.POST(request('POST', body))).status, 200);
  assert.equal(app.db.tables.quizzes[0].payload.question_reviews.length, 1);
  const report = app.db.tables.quizzes[0].payload.question_reviews[0];
  app.role('admin');
  const correction = { quiz_id: 'quiz', report_id: report.id, expected_question: before, question: after };
  const response = await app.handlers.PATCH(request('PATCH', correction));
  assert.equal(response.status, 200, JSON.stringify(await response.clone().json()));
  assert.equal(app.db.tables.quiz_attempts[0].payload.score, 1);
  assert.equal(app.db.tables.quizzes[0].payload.question_reviews[0].status, 'resolved');
  assert.equal((await app.handlers.PATCH(request('PATCH', correction))).status, 409);
});

test('invalid or stale corrections never change the question or student grade', async () => {
  const app = await apiHarness();
  await app.handlers.POST(request('POST', { quiz_id: 'quiz', question: before, reason: '' }));
  app.role('admin');
  const id = app.db.tables.quizzes[0].payload.question_reviews[0].id;
  const body = { quiz_id: 'quiz', report_id: id, expected_question: before, question: after };
  assert.equal((await app.handlers.PATCH(request('PATCH', { ...body, expected_question: after }))).status, 409);
  assert.equal((await app.handlers.PATCH(request('PATCH', { ...body, question: { ...after, answerOptions: after.answerOptions.map(o => ({ ...o, isCorrect: false })) } }))).status, 400);
  assert.equal(app.db.tables.quiz_attempts[0].payload.score, 0);
  assert.equal(app.db.tables.quizzes[0].payload.review_revision, 0);
});

test('old options without IDs remain correct after text-based legacy regrading', async () => {
  const app = await apiHarness();
  const raw = { ...before, answerOptions: before.answerOptions.map(({ id, ...option }) => option) };
  app.db.tables.quizzes[0].payload.questions = [raw];
  app.db.tables.quiz_attempts[0].payload.answer_log = [{ ...answer, selected_option_id: undefined }];
  await app.handlers.POST(request('POST', { quiz_id: 'quiz', question: raw, reason: '' }));
  const normalized = app.db.tables.quizzes[0].payload.questions[0];
  assert.deepEqual(normalized.answerOptions.map(o => o.id), ['0', '1']);
  app.role('admin');
  const response = await app.handlers.PATCH(request('PATCH', {
    quiz_id: 'quiz', report_id: app.db.tables.quizzes[0].payload.question_reviews[0].id,
    expected_question: normalized,
    question: { ...normalized, question: 'Corregida', answerOptions: normalized.answerOptions.map((o, i) => ({ ...o, isCorrect: i === 1 })) }
  }));
  assert.equal(response.status, 200);
  assert.equal(app.db.tables.quiz_attempts[0].payload.score, 1);
});

test('incomplete legacy logs expose missing information without inventing original answers', () => {
  const legacy = { ...attempt, score: 3, answered_questions: 4, total_questions: 10, answer_log: undefined };
  const result = applyQuestionCorrections(legacy, quiz);
  assert.equal(result.score, 4);
  assert.equal(result.review_ungradable_count, 3);
  assert.equal(result.answered_questions, 4);
  assert.equal(result.answer_log.length, 1);
  assert.equal(result.answer_log_incomplete, true);
});

test('a failed recalculation remains retryable and is never marked resolved early', async () => {
  const app = await apiHarness();
  await app.handlers.POST(request('POST', { quiz_id: 'quiz', question: before, reason: '' }));
  app.role('admin');
  const id = app.db.tables.quizzes[0].payload.question_reviews[0].id;
  const realFrom = app.db.from;
  app.db.from = table => {
    if (table === 'quiz_attempts') throw new Error('Temporary database failure');
    return realFrom(table);
  };
  const failed = await app.handlers.PATCH(request('PATCH', { quiz_id: 'quiz', report_id: id, expected_question: before, question: after }));
  assert.equal(failed.status, 500);
  assert.equal(app.db.tables.quizzes[0].payload.question_reviews[0].status, 'recalculating');
  app.db.from = realFrom;
  const retry = await app.handlers.PATCH(request('PATCH', { quiz_id: 'quiz', report_id: id, action: 'retry' }));
  assert.equal(retry.status, 200);
  assert.equal(app.db.tables.quiz_attempts[0].payload.score, 1);
  assert.equal(app.db.tables.quizzes[0].payload.question_reviews[0].status, 'resolved');
});
