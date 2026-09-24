import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { normalizeExpandedQuiz, normalizeQuizQuestion, validateNormalizedQuiz } from '../src/lib/quiz-normalization.js';

const fixture = {
  bloque: { id: 'demo', titulo: 'Cuestionario de prueba', sesion: 'Ejemplo', paginas: '1-2' },
  items: [
    { id: '1', tipo: 'respuesta_corta', prompt: 'Escribe azul', respuesta: { canonico: 'azul', acepta: ['Azul'] } },
    { id: '2', tipo: 'numerico', prompt: 'Dos más dos', respuesta: { valor: 4, tol: 0 } },
    { id: '3', tipo: 'enumeracion', prompt: 'Dos colores', respuesta: { elementos: [{ canonico: 'rojo' }, { canonico: 'azul' }] } },
    { id: '4', tipo: 'secuencia', prompt: 'Ordena', respuesta: { elementos: [{ canonico: 'primero' }, { canonico: 'segundo' }] } },
    { id: '5', tipo: 'relacion', prompt: 'Relaciona', respuesta: { pares: [{ izq: 'uno', der: 'primero' }, { izq: 'dos', der: 'segundo' }] } },
    { id: '6', tipo: 'cloze', prompt: 'El color es [c1] y luego [c2].', respuesta: { blancos: [{ c1: { canonico: 'rojo' } }, { c2: { canonico: 'azul' } }] } }
  ]
};
const engineSource = await readFile(new URL('../src/lib/normalizador.js', import.meta.url), 'utf8');
const dictionary = await readFile(new URL('../src/lib/sinonimos.json', import.meta.url), 'utf8');
const { motorAnatomia } = await import(`data:text/javascript;base64,${Buffer.from(engineSource.replace(/^import DIC from '\.\/sinonimos\.json';/m, `const DIC = ${dictionary};`)).toString('base64')}`);

test('imports a block through the uploader and validates every question', async () => {
  const source = await readFile(new URL('../src/components/quiz/FileUploader.jsx', import.meta.url), 'utf8');
  const context = vm.createContext({ normalizeExpandedQuiz, normalizeQuizQuestion, validateNormalizedQuiz, isSimplifiedFormat: () => false });
  vm.runInContext(source.slice(source.indexOf('  const processJsonData ='), source.indexOf('  const parseSyntaxError =')), context);
  vm.runInContext(source.slice(source.indexOf('  const validateJsonSchema ='), source.indexOf('  const updateJsonText =')), context);
  context.data = fixture;
  const result = vm.runInContext('processJsonData(data)', context);
  assert.equal(result.title, fixture.bloque.titulo);
  assert.deepEqual(result.bloque, fixture.bloque);
  assert.equal(result.questions.length, fixture.items.length);
  assert.equal(vm.runInContext('validateJsonSchema(data).errors.length', context), 0);
  assert.equal(validateNormalizedQuiz(result).length, 0);
  assert.throws(() => vm.runInContext('processJsonData(null)', context), /cuestionario/);
});

test('all six imported question types accept their correct answers and reject empty answers', () => {
  const quiz = normalizeExpandedQuiz(fixture);
  assert.equal(new Set(quiz.questions.map((q) => q.type)).size, 6);
  for (const question of quiz.questions) {
    const answer = question.respuesta;
    let input;
    if (question.type === 'respuesta_corta') input = answer.canonico;
    if (question.type === 'numerico') input = String(answer.valor);
    if (question.type === 'enumeracion' || question.type === 'secuencia') input = (answer.elementos ?? answer.pasos).map((item) => item.canonico);
    if (question.type === 'relacion') input = Object.fromEntries(answer.pares.map((pair) => [pair.clave, pair.canonico]));
    if (question.type === 'cloze') {
      input = Object.fromEntries(Object.entries(question.blancos).map(([key, blank]) => [key, blank.canonico]));
      for (const key of Object.keys(input)) assert.ok(question.texto.includes(`{{${key}}}`));
    }
    assert.equal(motorAnatomia.calificar(question, input).correcto, true, question.id);
    assert.equal(motorAnatomia.calificar(question, '').correcto, false, question.id);
    assert.deepEqual(normalizeQuizQuestion(question), question);
  }
});

test('keeps canonical formats and rejects missing open-ended answers', () => {
  const canonical = normalizeQuizQuestion({ tipo: 'cloze', prompt: 'Completa', texto: '{{c1}}', blancos: { c1: { canonico: 'piel' } } });
  assert.equal(validateNormalizedQuiz({ title: 'Quiz', questions: [canonical] }).length, 0);
  for (const type of ['respuesta_corta', 'numerico', 'enumeracion', 'secuencia', 'cloze', 'relacion']) {
    const question = normalizeQuizQuestion({ tipo: type, prompt: 'Pregunta' });
    assert.equal(validateNormalizedQuiz({ title: 'Quiz', questions: [question] }).length, 1, type);
  }
});
