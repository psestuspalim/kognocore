import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../src/pages/Quizzes.jsx', import.meta.url), 'utf8');
const handler = source.slice(source.indexOf('  const openQuizImporter ='), source.indexOf('  // Mutations'));

function setup(overrides = {}) {
  let destination;
  let opened = false;
  const context = vm.createContext({
    isAdmin: true,
    currentFolderId: null,
    selectedSubject: { id: 'old-subject', name: 'Otra materia', course_id: 'old-course' },
    selectedCourse: { id: 'old-course', name: 'Otro curso' },
    folders: [{ id: 'nested', name: 'Carpeta anidada' }],
    sameId: (a, b) => a === b,
    getFolderHierarchyContext: (id) => id === 'nested'
      ? { subject_id: 'owner-subject', course_id: 'owner-course' }
      : { subject_id: null, course_id: null },
    setImportDestination: (value) => { destination = JSON.parse(JSON.stringify(value)); },
    setShowGlobalUploaderDialog: (value) => { opened = value; },
    ...overrides
  });
  vm.runInContext(handler, context);
  return (expression) => {
    vm.runInContext(expression, context);
    return { destination, opened };
  };
}

test('imports into the current nested folder and inherits its hierarchy', () => {
  const result = setup({ currentFolderId: 'nested' })('openQuizImporter()');
  assert.equal(result.opened, true);
  assert.deepEqual(result.destination, { name: 'Carpeta anidada', folder_id: 'nested', subject_id: 'owner-subject', course_id: 'owner-course' });
});

test('explorer subject import ignores the previously selected folder and course', () => {
  const result = setup({ currentFolderId: 'nested' })("openQuizImporter('subject', { id: 'new', name: 'Nueva', course_id: 'new-course' })");
  assert.deepEqual(result.destination, { name: 'Nueva', folder_id: null, subject_id: 'new', course_id: 'new-course' });
});

test('explorer root folder import does not inherit an unrelated course or subject', () => {
  const result = setup()("openQuizImporter('folder', { id: 'root-folder', name: 'Raíz' })");
  assert.deepEqual(result.destination, { name: 'Raíz', folder_id: 'root-folder', subject_id: null, course_id: null });
});

test('current subject import stays in its subject', () => {
  const result = setup()('openQuizImporter()');
  assert.deepEqual(result.destination, { name: 'Otra materia', folder_id: null, subject_id: 'old-subject', course_id: 'old-course' });
});

test('non-admin users cannot open the importer', () => {
  assert.deepEqual(setup({ isAdmin: false })('openQuizImporter()'), { destination: undefined, opened: false });
});
