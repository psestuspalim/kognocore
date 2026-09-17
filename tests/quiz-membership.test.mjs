import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { quizBelongsToSubject } from '../src/lib/quiz-membership.js';

test('new subjects are empty at root, in courses and in nested folders, even without a code', () => {
  const storedQuizzes = [
    { id: 'a', subject_id: 'existing', title: 'Anatomía', subject: '' },
    { id: 'b', subject_id: 'other', subject: 'Anatomía' },
    { id: 'c' }, { id: 'd', subject_id: 'root' },
    { id: 'e', subject_id: 'subj_pediatria', title: 'Pediatría' },
  ];
  for (const context of [{}, { course_id: 'course' }, { folder_id: 'folder' }, { course_id: 'course', folder_id: 'deep-folder' }]) {
    for (const name of ['Anatomía', 'Pediatría', 'Medicina Interna', '']) {
      const subject = { id: 'new', name, ...context };
      assert.deepEqual(storedQuizzes.filter(quiz => quizBelongsToSubject(quiz, subject)), []);
    }
  }
});

test('explicit IDs determine membership, independently of names, codes and clinical keywords', () => {
  const subject = { id: 'new', name: 'Pediatría', code: 'ped' };
  assert.equal(quizBelongsToSubject({ subject_id: 'new', title: 'Cirugía' }, subject), true);
  assert.equal(quizBelongsToSubject({ subject_id: 'different', subject: 'Pediatría' }, subject), false);
  assert.equal(quizBelongsToSubject({ subject_id: 'ped' }, subject), false);
  assert.equal(quizBelongsToSubject({ subject_id: ' 12 ' }, { id: 12 }), true);
  assert.equal(quizBelongsToSubject({}, {}), false);
  const movedQuiz = { subject_id: 'new' };
  assert.equal(quizBelongsToSubject(movedQuiz, subject), true);
  movedQuiz.subject_id = 'destination';
  assert.equal(quizBelongsToSubject(movedQuiz, subject), false);
  assert.equal(quizBelongsToSubject(movedQuiz, { id: 'destination' }), true);
});

test('reloading the client preserves custom assignments and unassigned quizzes', () => {
  const source = readFileSync(new URL('../src/api/client.js', import.meta.url), 'utf8');
  const original = [
    { id: 'custom', subject_id: 'new-subject', course_id: 'new-course', folder_id: 'nested', title: 'Pediatría' },
    { id: 'unassigned', title: 'Cirugía' },
    { id: 'root', subject_id: 'root', course_id: 'custom-course' },
  ];
  const storage = new Map([['app_quizzes', JSON.stringify(original)]]);
  const context = vm.createContext({ console, window: {},
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    mockCourses: [], mockSubjects: [], mockFolders: [], mockQuizzes: [], mockResources: [], mockQuizSettings: {}, mockUser: {},
  });
  vm.runInContext(source.slice(source.indexOf('const SEED_VERSION'), source.indexOf('// ... imports')), context);
  vm.runInContext('initializeStorage()', context);
  assert.deepEqual(JSON.parse(storage.get('app_quizzes')), original);
});
