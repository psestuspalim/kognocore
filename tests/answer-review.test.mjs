import test from 'node:test';
import assert from 'node:assert/strict';
import { readableAnswer, possibleVerificationMismatch } from '../src/lib/answer-review.js';

test('displays saved JSON answers without serialization quotes', () => {
  assert.equal(readableAnswer('"Fémur"'), 'Fémur');
  assert.equal(readableAnswer('["Radio","Cúbito"]'), 'Radio; Cúbito');
  assert.equal(readableAnswer('{"A":"Radio"}'), 'A: Radio');
  assert.equal(readableAnswer('Respuesta libre'), 'Respuesta libre');
});

test('flags formatting matches without conflating opposite or numeric answers', () => {
  assert.equal(possibleVerificationMismatch('"  FÉMUR  "', 'femur'), true);
  assert.equal(possibleVerificationMismatch('arteria   radial', 'Arteria radial'), true);
  assert.equal(possibleVerificationMismatch('', ''), false);
  assert.equal(possibleVerificationMismatch('izquierdo', 'derecho'), false);
  assert.equal(possibleVerificationMismatch('-5', '5'), false);
  assert.equal(possibleVerificationMismatch('1.5', '15'), false);
});
