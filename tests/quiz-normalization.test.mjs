import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeQuizQuestion, validateNormalizedQuiz, normalizeQuestionType, OPEN_ENDED_TYPES } from '../src/lib/quiz-normalization.js';

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

test('normalizes question types handling accents, spaces, and synonyms', () => {
  assert.equal(normalizeQuestionType('definición'), 'definicion');
  assert.equal(normalizeQuestionType('Respuesta Corta'), 'respuesta_corta');
  assert.equal(normalizeQuestionType('short_answer'), 'respuesta_corta');
  assert.equal(normalizeQuestionType('numérico'), 'numerico');
  assert.equal(normalizeQuestionType('relación'), 'relacion');
  assert.equal(normalizeQuestionType('enumeración'), 'enumeracion');
  assert.ok(OPEN_ENDED_TYPES.has('definicion'));
  assert.ok(OPEN_ENDED_TYPES.has('respuesta_corta'));
});

test('identifies definicion and respuesta_corta as open-ended with empty answerOptions', () => {
  const qDef = normalizeQuizQuestion({
    id: 'P1-B23-039',
    tipo: 'definicion',
    prompt: 'Define brevemente: osificación intramembranosa.',
    respuesta: { modelo: 'Modelo...', palabras_clave: ['hueso'] }
  });
  assert.equal(qDef.type, 'definicion');
  assert.ok(OPEN_ENDED_TYPES.has(qDef.type));
  assert.deepEqual(qDef.answerOptions, []);

  const qCorta = normalizeQuizQuestion({
    id: 'P1-B23-066',
    tipo: 'respuesta_corta',
    prompt: '¿Qué músculo extrínseco intermedio...?',
    respuesta: { canonico: 'serrato posteroinferior' }
  });
  assert.equal(qCorta.type, 'respuesta_corta');
  assert.ok(OPEN_ENDED_TYPES.has(qCorta.type));
  assert.deepEqual(qCorta.answerOptions, []);

  // Infer open-ended type if tipo was missing but respuesta.modelo exists
  const qInferred = normalizeQuizQuestion({
    prompt: 'Define algo',
    respuesta: { modelo: 'Es...', palabras_clave: ['clave'] }
  });
  assert.equal(qInferred.type, 'definicion');
  assert.ok(OPEN_ENDED_TYPES.has(qInferred.type));
});

test('normalizing a question with explicit correct answers remains idempotent and valid', () => {
  const compactQ = {
    x: 'Pregunta de prueba',
    dif: 2,
    o: [
      { l: 'A', t: 'Opción A', c: false },
      { l: 'B', t: 'Opción B', c: false },
      { l: 'C', t: 'Opción C', c: false },
      { l: 'D', t: 'Opción D', c: false },
      { l: 'E', t: 'Opción E', c: true, r: 'Justificación E' }
    ]
  };

  const pass1 = normalizeQuizQuestion(compactQ, 0);
  assert.equal(pass1.correctAnswer, 4);
  assert.equal(pass1.answerOptions.filter(o => o.isCorrect).length, 1);

  // Re-normalizing should not match correctAnswer=4 against index+1=4 (Option D)
  const pass2 = normalizeQuizQuestion(pass1, 0);
  assert.equal(pass2.correctAnswer, 4);
  assert.equal(pass2.answerOptions.filter(o => o.isCorrect).length, 1);
  assert.equal(pass2.answerOptions[3].isCorrect, false);
  assert.equal(pass2.answerOptions[4].isCorrect, true);

  const errors = validateNormalizedQuiz({ title: 'Test Quiz', questions: [pass2] });
  assert.equal(errors.length, 0);
});
