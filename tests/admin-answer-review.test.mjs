import test from 'node:test';
import assert from 'node:assert/strict';
import { approveAnswer } from '../api/_answer-review.mjs';
import { answerOutcome, recordedAnswers } from '../src/lib/answer-report.js';
import { applyQuestionCorrections } from '../src/lib/question-review.js';

const answer = { question: 'Q', selected_answer: 'respuesta', is_correct: false, result: { correcto: false, puntos: 0, max: 2 }, score: 0, max_score: 2 };
const attempt = { is_completed: true, score: 1, total_questions: 3, percentage: 100 / 3, answer_log: [{ question: 'Otra', is_correct: true }, answer, { ...answer }], wrong_questions: [answer, { ...answer }] };
const review = { source: 'answer_log', index: 1, question: 'Q', selected_answer: 'respuesta', expected_score: 1, reason: 'Equivalencia válida' };
const admin = { id: 'admin', email: 'admin@example.com' };

test('corrects one occurrence, updates score and retains evidence and reviewer', () => {
  const next = approveAnswer(attempt, review, admin, '2026-10-29T00:00:00Z');
  assert.equal(next.score, 2);
  assert.ok(Math.abs(next.percentage - 200 / 3) < 0.000001);
  assert.equal(next.wrong_questions.length, 1);
  assert.equal(next.answer_log[2].is_correct, false);
  assert.equal(next.answer_log[1].score, 2);
  assert.equal(next.answer_log[1].selected_answer, answer.selected_answer);
  assert.equal(next.answer_log[1].admin_review.original_result.correcto, false);
  assert.equal(next.admin_reviews[0].reviewed_by, 'admin');
  assert.equal(answerOutcome(next.answer_log[1]).label, 'Validada por el administrador');
  assert.equal(attempt.score, 1);
  assert.throws(() => approveAnswer(next, review, admin), /ya fue validada/);
  const regraded = applyQuestionCorrections(next, { question_corrections: [{ revision: 1,
    before: { question: 'Q' }, after: { question: 'Q', answerOptions: [{ id: '1', text: 'Distinta', isCorrect: true }] }
  }] });
  assert.equal(regraded.answer_log[1].is_correct, true);
  assert.equal(regraded.answer_log[1].admin_review.reason, review.reason);
});

test('rejects ongoing attempts, stale answers and missing justification', () => {
  assert.throws(() => approveAnswer({ ...attempt, is_completed: false }, review, admin), /termine/);
  assert.throws(() => approveAnswer(attempt, { ...review, index: -1 }, admin), /cambió/);
  assert.throws(() => approveAnswer(attempt, { ...review, selected_answer: 'old' }, admin), /cambió/);
  assert.throws(() => approveAnswer(attempt, { ...review, reason: ' ' }, admin), /motivo/);
});

test('legacy attempts retain reviewed answers without fabricating a full answer log', () => {
  const legacy = { is_completed: true, score: 4, total_questions: 6, wrong_questions: [answer, { ...answer }] };
  const next = approveAnswer(legacy, { ...review, source: 'wrong_questions', index: 0, expected_score: 4 }, admin);
  assert.equal(next.score, 5);
  assert.equal(next.answer_log, undefined);
  assert.equal(next.wrong_questions.length, 1);
  assert.equal(next.admin_reviewed_answers.length, 1);
  assert.equal(recordedAnswers(next).filter(item => item.is_correct).length, 1);
  assert.throws(() => approveAnswer(next, { ...review, source: 'wrong_questions', index: 0, expected_score: 4 }, admin), /calificación cambió/);
});
