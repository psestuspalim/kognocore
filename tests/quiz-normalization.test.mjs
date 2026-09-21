import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeQuizQuestion, validateNormalizedQuiz } from '../src/lib/quiz-normalization.js';

test('infers a correct string option from a letter and keeps the explanation', () => {
  const question = normalizeQuizQuestion({
    pregunta: 'Pregunta',
    opciones: ['Uno', 'Dos', 'Tres'],
    correcta: 'b',
    justificacion: 'Dos es la respuesta.'
  });
  assert.deepEqual(question.answerOptions.map((option) => option.isCorrect), [false, true, false]);
  assert.equal(question.feedback, 'Dos es la respuesta.');
  assert.equal(question.answerOptions[1].rationale, 'Dos es la respuesta.');
});

test('accepts correct answers expressed as text or one-based index', () => {
  assert.equal(normalizeQuizQuestion({ question: 'Q', options: ['A', 'B'], correctAnswer: 'B' }).correctAnswer, 1);
  assert.equal(normalizeQuizQuestion({ question: 'Q', options: ['A', 'B'], correctAnswer: 2 }).correctAnswer, 1);
});

test('rejects missing and multiple correct answers for a regular question', () => {
  const base = { title: 'Quiz', questions: [{ question: 'Q', answerOptions: [{ text: 'A' }, { text: 'B' }] }] };
  assert.match(validateNormalizedQuiz(base)[0].text, /no tiene respuesta correcta/);
  const multiple = { ...base, questions: [{ ...base.questions[0], answerOptions: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: true }] }] };
  assert.match(validateNormalizedQuiz(multiple)[0].text, /solo puede tener una/);
});
