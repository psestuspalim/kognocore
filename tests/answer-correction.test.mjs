import test from 'node:test';
import assert from 'node:assert/strict';
import { selfCorrectAnswer, canSelfCorrect } from '../src/lib/answer-correction.js';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const wrong = () => ({
  question: 'Nombra la estructura', selected_answer: 'proceso espinoso', correct_answer: 'apófisis espinosa',
  is_correct: false, response_time: 8, inputs: { text: 'proceso espinoso' },
  result: { correcto: false, puntos: 1, max: 3, detalle: [{ ok: false, dado: 'proceso espinoso' }], sobrantes: ['proceso espinoso'] }
});

test('self-correction updates scores and partial credit while preserving the original answer and evaluation', () => {
  const answer = wrong();
  const before = JSON.stringify(answer);
  const next = selfCorrectAnswer([answer], 0, '2026-10-02T17:00:00Z');
  assert.equal(next.score, 1);
  assert.equal(next.wrongAnswers.length, 0);
  const corrected = next.correctAnswers[0];
  assert.equal(corrected.result.puntos, 3);
  assert.equal(corrected.result.correcto, true);
  assert.equal(corrected.result.detalle[0].ok, true);
  assert.deepEqual(corrected.result.sobrantes, []);
  assert.equal(corrected.self_correction.original_result.puntos, 1);
  assert.equal(corrected.self_correction.corrected_at, '2026-10-02T17:00:00Z');
  assert.equal(corrected.selected_answer, answer.selected_answer);
  assert.deepEqual(corrected.inputs, answer.inputs);
  assert.equal(corrected.response_time, 8);
  assert.equal(JSON.stringify(answer), before);
  assert.equal(selfCorrectAnswer(next.answerLog, 0), null);
});

test('identical prompts are separate occurrences and already-correct or multiple-choice answers cannot be overridden', () => {
  const next = selfCorrectAnswer([wrong(), wrong()], 1);
  assert.equal(next.score, 1);
  assert.equal(next.answerLog[0].is_correct, false);
  assert.equal(next.answerLog[1].is_correct, true);
  assert.equal(canSelfCorrect({ ...wrong(), is_correct: true }), false);
  assert.equal(canSelfCorrect({ is_correct: false, selected_answer: 'A' }), false);
  assert.equal(canSelfCorrect(null), false);
  assert.equal(selfCorrectAnswer([wrong()], -1), null);
  assert.equal(selfCorrectAnswer([wrong()], 4), null);
  assert.equal(selfCorrectAnswer([wrong()], 0.5), null);
  assert.equal(canSelfCorrect({ ...wrong(), is_correct: undefined }), true);
});

test('persisted corrections survive JSON storage without restoring the automatic failure', () => {
  const next = selfCorrectAnswer([wrong()], 0);
  const saved = JSON.parse(JSON.stringify({ score: next.score, answer_log: next.answerLog, wrong_questions: next.wrongAnswers }));
  assert.equal(saved.score, 1);
  assert.equal(saved.answer_log[0].result.puntos, 3);
  assert.equal(saved.answer_log[0].self_correction.original_result.correcto, false);
  assert.equal(saved.wrong_questions.length, 0);
  assert.equal(canSelfCorrect(saved.answer_log[0]), false);
});

test('quiz handler persists the same corrected snapshot to session and attempt and ignores rapid duplicate clicks', async () => {
  const source = readFileSync(new URL('../src/pages/Quizzes.jsx', import.meta.url), 'utf8');
  const fragment = source.slice(source.indexOf('  const handleCorrectAnswer ='), source.indexOf('  const handleNextQuestion ='));
  const writes = [], sessions = [], states = {};
  let finish;
  const context = vm.createContext({
    selfCorrectAnswer, correctionLock: { current: false }, answerLog: [wrong()],
    selectedQuiz: { id: 'quiz', questions: [{}] }, currentAttemptId: 'attempt', currentSessionId: null,
    currentQuestionIndex: 0, markedQuestions: new Set(), responseTimes: [8], deckType: 'all',
    view: 'quiz', currentUser: { learner_id: 'learner' },
    buildAttemptIdentity: () => ({ learner_id: 'learner' }),
    setScore: value => { states.score = value; }, setAnswerLog: value => { states.answerLog = value; },
    setWrongAnswers: value => { states.wrongAnswers = value; }, setCorrectAnswers: value => { states.correctAnswers = value; },
    saveActiveQuizSession: value => sessions.push(value),
    updateAttemptMutation: { mutateAsync: value => { writes.push(value); return new Promise(resolve => { finish = resolve; }); } },
    toast: { success() {}, info() {}, error() {} }, queryClient: { invalidateQueries() {} }
  });
  vm.runInContext(fragment + ';globalThis.correct = handleCorrectAnswer;', context);
  const saving = context.correct(0);
  await context.correct(0);
  assert.equal(writes.length, 1);
  assert.equal(states.score, 1);
  assert.equal(sessions[0].answerLog[0].is_correct, true);
  assert.equal(writes[0].data.wrong_questions.length, 0);
  assert.equal(writes[0].data.answer_log[0].self_correction.original_result.correcto, false);
  finish({ _sync_status: 'pending' });
  await saving;
  assert.equal(context.correctionLock.current, false);
});
