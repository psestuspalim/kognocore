import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { selfCorrectAnswer, canSelfCorrect } from '../src/lib/answer-correction.js';
import { normalizeQuizQuestion } from '../src/lib/quiz-normalization.js';

const source = readFileSync(new URL('../src/lib/normalizador.js', import.meta.url), 'utf8');
const dictionary = readFileSync(new URL('../src/lib/sinonimos.json', import.meta.url), 'utf8');
const { motorAnatomia } = await import(`data:text/javascript;base64,${Buffer.from(source.replace(/^import DIC from '\.\/sinonimos\.json'(?: with \{ type: 'json' \})?;/m, `const DIC = ${dictionary};`)).toString('base64')}`);
const grade = (q, payload) => motorAnatomia.calificar(q, payload);
const question = normalizeQuizQuestion({ tipo: 'respuesta_corta', prompt: 'Nombra el hueso', respuesta: { canonica: 'fémur', canonico: 'fémur', aceptadas: ['fémur'] } });
const wrong = () => ({ question: 'Nombra el hueso', selected_answer: 'tibia', inputs: { text: 'tibia' }, is_correct: false, response_time: 8, result: grade(question, 'tibia') });

test('editing does not award correctness: unchanged or wrong text stays wrong', () => {
  const original = wrong();
  assert.equal(original.result.correcto, false);
  assert.equal(selfCorrectAnswer([original], 0), null);
  const next = selfCorrectAnswer([original], 0, question, { text: 'tibia' }, grade);
  assert.equal(next.score, 0);
  assert.equal(next.wrongAnswers.length, 1);
  assert.equal(canSelfCorrect(next.answerLog[0]), true);
});

test('canonical edited answer is graded, preserves history, and changes only one occurrence', () => {
  const original = wrong();
  const before = JSON.stringify(original);
  const next = selfCorrectAnswer([original, wrong()], 1, question, { text: 'fémur' }, grade);
  assert.equal(next.score, 1);
  assert.equal(next.answerLog[0], original);
  const edited = next.answerLog[1];
  assert.equal(edited.is_correct, true);
  assert.equal(edited.inputs.text, 'fémur');
  assert.equal(edited.selected_answer, JSON.stringify('fémur'));
  assert.equal(edited.answer_revisions[0].inputs.text, 'tibia');
  assert.equal(edited.response_time, 8);
  assert.equal(JSON.stringify(original), before);
  assert.equal(canSelfCorrect(edited), false);
  const restored = JSON.parse(JSON.stringify(next)).answerLog[1];
  assert.equal(restored.result.correcto, true);
  assert.equal(restored.inputs.text, 'fémur');
  assert.equal(restored.answer_revisions[0].result.correcto, false);
});

test('structured edits preserve field keys, order and partial evaluation without overriding it', () => {
  for (const tipo of ['cloze', 'relacion', 'enumeracion', 'secuencia']) {
    const inputs = { 0: 'uno', 1: 'dos' };
    const original = { ...wrong(), inputs: { 0: '', 1: '' } };
    const result = { correcto: false, puntos: 1, max: 2, detalle: [{ ok: true }, { ok: false }] };
    const next = selfCorrectAnswer([original], 0, { tipo }, inputs, (_q, payload) => {
      assert.deepEqual(payload, ['enumeracion', 'secuencia'].includes(tipo) ? ['uno', 'dos'] : inputs);
      return result;
    });
    assert.equal(next.score, 0);
    assert.deepEqual(next.answerLog[0].result, result);
  }
  assert.equal(selfCorrectAnswer([wrong()], -1, question, { text: 'fémur' }, grade), null);
  assert.equal(canSelfCorrect({ is_correct: false }), false);
  assert.throws(() => selfCorrectAnswer([wrong()], 0, question, { text: 'fémur' }, () => { throw new Error('grading'); }));
});

test('quiz handler persists reevaluation to session and attempt and ignores duplicate saves', async () => {
  const page = readFileSync(new URL('../src/pages/Quizzes.jsx', import.meta.url), 'utf8');
  const fragment = page.slice(page.indexOf('  const handleCorrectAnswer ='), page.indexOf('  const handleNextQuestion ='));
  const writes = [], sessions = [], states = {};
  let finish;
  const context = vm.createContext({
    selfCorrectAnswer, normalizeQuizQuestion, motorAnatomia, correctionLock: { current: false }, answerLog: [wrong()],
    selectedQuiz: { id: 'quiz', questions: [question] }, currentAttemptId: 'attempt', currentSessionId: null,
    currentQuestionIndex: 0, markedQuestions: new Set(), responseTimes: [8], deckType: 'all',
    view: 'quiz', currentUser: { learner_id: 'learner' }, buildAttemptIdentity: () => ({ learner_id: 'learner' }),
    setScore: value => { states.score = value; }, setAnswerLog: value => { states.answerLog = value; },
    setWrongAnswers() {}, setCorrectAnswers() {}, saveActiveQuizSession: value => sessions.push(value),
    updateAttemptMutation: { mutateAsync: value => { writes.push(value); return new Promise(resolve => { finish = resolve; }); } },
    toast: { success() {}, info() {}, error() {} }, queryClient: { invalidateQueries() {} }
  });
  vm.runInContext(fragment + ';globalThis.correct = handleCorrectAnswer;', context);
  const saving = context.correct(0, { text: 'fémur' });
  await context.correct(0, { text: 'fémur' });
  assert.equal(writes.length, 1);
  assert.equal(states.score, 1);
  assert.equal(sessions[0].answerLog[0].inputs.text, 'fémur');
  assert.equal(writes[0].data.answer_log[0].answer_revisions[0].result.correcto, false);
  finish({ _sync_status: 'pending' });
  await saving;
  assert.equal(context.correctionLock.current, false);
});
