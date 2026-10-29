import test from 'node:test';
import assert from 'node:assert/strict';
import { answerOutcome, recordedAnswers } from '../src/lib/answer-report.js';

test('reports distinguish automatic, manual and reevaluated correct answers', () => {
  assert.equal(answerOutcome({ is_correct: true }).label, 'Correcta en la evaluación inicial');
  const manual = answerOutcome({ is_correct: true, selected_answer: 'original', self_correction: { corrected_at: '2026-10-01' } });
  assert.equal(manual.label, 'Marcada como correcta por el alumno');
  assert.equal(manual.originalAnswer, 'original');
  const revised = answerOutcome({ is_correct: true, selected_answer: 'final', answer_revisions: [
    { selected_answer: 'primera', corrected_at: '2026-10-01' },
    { selected_answer: 'segunda', corrected_at: '2026-10-02' }
  ] });
  assert.equal(revised.label, 'Correcta tras editar y reevaluar');
  assert.equal(revised.originalAnswer, 'primera');
  assert.equal(revised.revisionCount, 2);
  assert.equal(revised.changedAt, '2026-10-02');
});

test('an edited incorrect answer is never reported as correct', () => {
  assert.equal(answerOutcome({ is_correct: false, answer_revisions: [{ selected_answer: 'x' }] }).label, 'Incorrecta tras editar y reevaluar');
});

test('old attempts do not invent correct answers; duplicate occurrences in a log survive', () => {
  assert.deepEqual(recordedAnswers({ score: 10, wrong_questions: [{ question: 'Error' }] }), [{ question: 'Error', is_correct: false }]);
  const log = [{ question: 'Q', is_correct: true }, { question: 'Q', is_correct: false }];
  assert.deepEqual(recordedAnswers({ answer_log: log, wrong_questions: [] }), log);
});
