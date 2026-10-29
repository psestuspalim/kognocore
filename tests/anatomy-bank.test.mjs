import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile, readdir } from 'node:fs/promises';
import { normalizeExpandedQuiz, validateNormalizedQuiz } from '../src/lib/quiz-normalization.js';

const root = new URL('./fixtures/anatomia-2026-10-03/', import.meta.url);
const source = await readFile(new URL('../src/lib/normalizador.js', import.meta.url), 'utf8');
const dictionary = await readFile(new URL('../src/lib/sinonimos.json', import.meta.url), 'utf8');
const { motorAnatomia: motor } = await import(`data:text/javascript;base64,${Buffer.from(source.replace(/^import DIC from '\.\/sinonimos\.json'(?: with \{ type: 'json' \})?;/m, `const DIC = ${dictionary};`)).toString('base64')}`);
const stripAccents = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

test('the supplied 68 regression cases pass with the integrated dictionary', async () => {
  const bank = JSON.parse(await readFile(new URL('fixtures-prueba.json', root), 'utf8'));
  const script = await readFile(new URL('regresiones.txt', root), 'utf8');
  const body = script.slice(script.indexOf("console.log('\\n== Equivalencia"), script.lastIndexOf('console.log(`'));
  let checks = 0;
  vm.runInNewContext(body, {
    motor, item: id => bank.items.find(q => q.id === id),
    console: { log() {} },
    t: (description, passed) => { checks++; assert.equal(Boolean(passed), true, description); }
  });
  assert.equal(checks, 68);
});

test('the integrated engine passes its capability diagnostic', () => {
  assert.equal(motor.autodiagnostico().ok, true, JSON.stringify(motor.autodiagnostico()));
});

test('all 12 supplied blocks import and all 300 canonical answers grade correctly without accents', async () => {
  const files = (await readdir(root)).filter(name => /^P1-B.*\.json$/.test(name));
  assert.equal(files.length, 12);
  let count = 0;
  let points = 0;
  for (const file of files) {
    const quiz = normalizeExpandedQuiz(JSON.parse(await readFile(new URL(file, root), 'utf8')));
    assert.deepEqual(validateNormalizedQuiz(quiz), [], file);
    for (const q of quiz.questions) {
      const r = q.respuesta;
      let answer;
      if (q.type === 'cloze') answer = Object.fromEntries(Object.entries(q.blancos).map(([key, b]) => [key, stripAccents(b.canonico)]));
      if (q.type === 'enumeracion' || q.type === 'secuencia') answer = r.elementos.map(b => stripAccents(b.canonico));
      if (q.type === 'respuesta_corta') answer = stripAccents(r.canonico);
      if (q.type === 'numerico') answer = String(r.valor ?? r.rango[0]);
      const result = motor.calificar(q, answer);
      assert.equal(result.correcto, true, `${q.id}: ${JSON.stringify(result)}`);
      assert.equal(motor.calificar(q, '').correcto, false, `${q.id}: empty answer`);
      assert.equal(result.feedback, q.feedback);
      points += result.max;
      count++;
    }
  }
  assert.equal(count, 300);
  assert.equal(points, 788);
});

test('generic nouns remain optional without conflating opposing anatomical structures', () => {
  for (const [answer, canonical] of [['sagital', 'plano sagital'], ['sistemas', 'anatomía por sistemas'], ['cuerpos vertebrales', 'articulaciones de los cuerpos vertebrales']]) {
    assert.equal(motor.coincide(answer, [canonical]).ok, true);
  }
  for (const [answer, canonical] of [['ligamento', 'ligamento nucal'], ['L4', 'L5'], ['aductor largo', 'abductor largo'], ['epífisis anular superior', 'epífisis anular inferior']]) {
    assert.equal(motor.coincide(answer, [canonical]).ok, false);
  }
  const item = { tipo: 'enumeracion', respuesta: { elementos: [{ canonico: 'arteria facial' }, { canonico: 'vena facial' }] } };
  assert.equal(motor.calificar(item, ['facial', 'facial']).puntos, 0);
  assert.equal(motor.calificar(item, ['arteria facial', 'vena facial']).puntos, 2);
});

test('numeric ranges accept a hyphen while a list of guesses cannot satisfy a single value', () => {
  const range = { tipo: 'numerico', respuesta: { rango: [1, 2], unidad: '%' } };
  assert.equal(motor.calificar(range, '1-2 %').correcto, true);
  assert.equal(motor.calificar(range, '1–2 %').correcto, true);
  assert.equal(motor.calificar(range, '1-5 %').correcto, false);
  assert.equal(motor.calificar({ tipo: 'numerico', respuesta: { valor: 2 } }, '1 2 3').correcto, false);
  assert.equal(motor.calificar({ tipo: 'numerico', respuesta: { valor: -2.5 } }, '-2,5').correcto, true);
});
