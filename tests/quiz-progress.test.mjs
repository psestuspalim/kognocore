import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { sessionKey, countDescendantQuizzes } from '../src/lib/quiz-progress.js';

test('counts quizzes at every level once, including deeply nested folders and cycles', () => {
  const containers = [{ id: 'course' }, { id: 'subject', parent_id: 'course' },
    { id: 'folder', parent_id: 'subject' }, { id: 'deep', parent_id: 'folder' }];
  const quizzes = [{ id: 'a', subject_id: 'subject' },
    { id: 'b', subject_id: 'subject', folder_id: 'deep' }, { id: 'c', folder_id: 'folder' }];
  assert.equal(countDescendantQuizzes('course', containers, quizzes), 3);
  assert.equal(countDescendantQuizzes('subject', containers, quizzes), 3);
  assert.equal(countDescendantQuizzes('folder', containers, quizzes), 2);
  assert.equal(countDescendantQuizzes('deep', containers, quizzes), 1);
  assert.equal(countDescendantQuizzes('missing', containers, quizzes), 0);
  assert.equal(countDescendantQuizzes('folder', [...containers, { id: 'folder', parent_id: 'deep' }], quizzes), 2);
});

test('reload retains each learner and quiz independently, including selected feedback and review options', () => {
  const source = readFileSync(new URL('../src/pages/Quizzes.jsx', import.meta.url), 'utf8');
  const storage = new Map();
  const context = vm.createContext({ sessionKey, console, localStorage: {
    setItem: (key, value) => storage.set(key, value), getItem: key => storage.get(key) || null,
    removeItem: key => storage.delete(key)
  } });
  vm.runInContext(source.slice(source.indexOf('function normalizeId'), source.indexOf('function normalizeOptionText')), context);
  const user = { learner_id: 'one' }, other = { learner_id: 'two' };
  const data = id => ({ selectedQuiz: { id, questions: [{ question: 'Question', answerOptions: [
    { text: 'wrong', isCorrect: false, rationale: 'Specific reason' }, { text: 'right', isCorrect: true }
  ] }] }, score: 0, currentQuestionIndex: 0,
  answerLog: [{ selected_answer: 'wrong', explanation: 'Specific reason' }],
  wrongAnswers: [{ question: 'Question', answerOptions: [{ text: 'wrong', rationale: 'Specific reason' }] }] });
  context.saveActiveQuizSession(data('a'), user);
  context.saveActiveQuizSession(data('b'), user);
  context.saveActiveQuizSession(data('a'), other);
  assert.equal(storage.size, 3);
  assert.equal(context.getActiveQuizSession(user, 'a').answerLog[0].selected_answer, 'wrong');
  assert.equal(context.getActiveQuizSession(user, 'a').wrongAnswers[0].answerOptions[0].rationale, 'Specific reason');
  assert.equal(context.getActiveQuizSession({ learner_id: 'unknown' }, 'a'), null);
  context.clearActiveQuizSession(user, 'a');
  assert.equal(context.getActiveQuizSession(user, 'a'), null);
  assert.ok(context.getActiveQuizSession(user, 'b'));
  assert.ok(context.getActiveQuizSession(other, 'a'));
});

test('JSON conversion preserves wrong-option explanations in object and array formats', async () => {
  const source = readFileSync(new URL('../src/components/utils/quizFormats.jsx', import.meta.url), 'utf8');
  const { fromSimplifiedFormat } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  for (const opciones of [{ a: { texto: 'wrong', rationale: 'Why wrong' }, b: 'right' },
    [{ letra: 'a', texto: 'wrong', rationale: 'Why wrong' }, { letra: 'b', texto: 'right' }]]) {
    const quiz = fromSimplifiedFormat([{ pregunta: 'Question', opciones, correcta: 'b', justificacion: 'Why right' }]);
    assert.equal(quiz.questions[0].answerOptions[0].rationale, 'Why wrong');
    assert.equal(quiz.questions[0].answerOptions[1].rationale, 'Why right');
  }
});

test('pending writes survive reload, slow writes do not erase newer answers or other attempts', async () => {
  const source = readFileSync(new URL('../src/api/client.js', import.meta.url), 'utf8');
  let stored = [];
  const requests = [];
  const context = vm.createContext({ console, entityName: 'QuizAttempt',
    getItems: () => structuredClone(stored), saveItems: (_, items) => { stored = structuredClone(items); },
    requestJson: (_, init) => new Promise((resolve, reject) => requests.push({ resolve, reject, body: JSON.parse(init.body) }))
  });
  vm.runInContext(source.slice(source.indexOf('const REMOTE_ENTITIES'), source.indexOf('const requestJson')), context);
  vm.runInContext(source.slice(source.indexOf('const remoteWrites'), source.indexOf('const deleteRemoteEntity')), context);
  const entity = vm.runInContext(`({${source.slice(source.indexOf('create: async (data)'), source.indexOf('        delete: async (id)'))}})`, context);
  const a = await entity.create({ learner_id: 'student-a', answered_questions: 0 });
  await new Promise(resolve => setImmediate(resolve));
  const first = entity.update(a.id, { answered_questions: 1, answer_log: ['a'] });
  const second = entity.update(a.id, { answered_questions: 2, answer_log: ['a', 'b'] });
  await entity.create({ learner_id: 'student-b', answered_questions: 0 });
  assert.equal(stored.find(item => item.id === a.id).answered_questions, 2);
  assert.equal(stored.find(item => item.id === a.id)._sync_status, 'pending');
  // Fail the original request after newer answers have already been written locally.
  requests[0].reject(new Error('offline'));
  for (let i = 0; i < 8; i++) {
    await new Promise(resolve => setImmediate(resolve));
    for (const request of requests) request.resolve({ ok: true });
  }
  await Promise.all([first, second]);
  assert.equal(stored.length, 2);
  assert.equal(stored.find(item => item.id === a.id).answered_questions, 2);
  assert.equal(stored.find(item => item.id === a.id)._sync_status, undefined);
  assert.equal(requests.at(-1).body.attempt.answered_questions, 2);
});
