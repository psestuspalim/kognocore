import test from 'node:test';
import assert from 'node:assert/strict';
import { QUIZ_TEMPLATE, QUIZ_TEMPLATE_TEXT } from '../src/lib/quiz-template.js';
import { OPEN_ENDED_TYPES, normalizeExpandedQuiz, validateNormalizedQuiz } from '../src/lib/quiz-normalization.js';

test('the copyable base structure passes the importer validation and covers every question type', () => {
  const quiz = normalizeExpandedQuiz(JSON.parse(QUIZ_TEMPLATE_TEXT));
  assert.deepEqual(validateNormalizedQuiz(quiz), []);
  assert.equal(quiz.questions.length, QUIZ_TEMPLATE.questions.length);
  const types = new Set(QUIZ_TEMPLATE.questions.map(question => question.tipo).filter(Boolean));
  assert.deepEqual([...types].sort(), [...OPEN_ENDED_TYPES].sort());
  assert.ok(QUIZ_TEMPLATE.questions.some(question => Array.isArray(question.answerOptions)));
  // No fixed id or destination: the import dialog decides where the quiz goes.
  assert.equal(QUIZ_TEMPLATE.id, undefined);
  assert.equal(quiz.subject_id, null);
});
