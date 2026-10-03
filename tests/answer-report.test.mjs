import test from 'node:test';
import assert from 'node:assert/strict';
import { correctAnswerText } from '../src/lib/answer-report.js';

test('preserves the saved answer even if the quiz was edited', () => {
  assert.equal(correctAnswerText({ correct_answer: 'Original' }, { correct_answer: 'Edited' }), 'Original');
});

test('recovers expected answers from old open-ended grading records', () => {
  assert.equal(correctAnswerText({ answerOptions: [], result: { detalle: [
    { clave: 'Hueso', esperado: 'Fémur', ok: false },
    { clave: 'Músculo', esperado: 'Bíceps', ok: true }
  ] } }), 'Hueso: Fémur; Músculo: Bíceps');
  assert.equal(correctAnswerText({ result: { detalle: [{ esperado: 0 }] } }), '0');
});

test('includes every correct option and supports compact option text', () => {
  assert.equal(correctAnswerText({ answerOptions: [
    { text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }, { t: 'C', c: true }
  ] }), 'A; C');
});

test('recovers open-ended answer keys from the original question', () => {
  for (const [question, expected] of [
    [{ respuesta: { canonico: 'Fémur' } }, 'Fémur'],
    [{ respuesta: { valor: 0, unidad: 'mm' } }, '0 mm'],
    [{ respuesta: { rango: [1, 2], unidad: 'cm' } }, '1–2 cm'],
    [{ respuesta: { elementos: [{ canonico: 'A' }, { canonico: 'B' }] } }, '1: A; 2: B'],
    [{ respuesta: { pasos: [{ canonico: 'Inicio' }] } }, '1: Inicio'],
    [{ respuesta: { pares: [{ clave: 'A', canonico: 'B' }] } }, 'A: B'],
    [{ blancos: { c1: { canonico: 'Fémur' } } }, 'Espacio c1: Fémur']
  ]) assert.equal(correctAnswerText({ answerOptions: [] }, question), expected);
});

test('does not present an incorrect student answer as the correct answer', () => {
  assert.equal(correctAnswerText({ selected_answer: 'Incorrecta', is_correct: false }), '');
});
