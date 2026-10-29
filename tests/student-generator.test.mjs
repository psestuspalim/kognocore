import test from 'node:test';
import assert from 'node:assert/strict';
import { generateStudentCredentials, registerStudentBatch, credentialsText } from '../src/lib/student-generator.js';
import { validateStudentInput } from '../api/_students.mjs';

test('generated batches avoid existing names and satisfy account validation', () => {
  const prior = generateStudentCredentials(50);
  const rows = generateStudentCredentials(50, prior.map(row => row.username.toUpperCase()));
  const used = new Set(prior.map(row => row.username));
  assert.equal(new Set(rows.map(row => row.username)).size, 50);
  for (const row of rows) {
    assert.equal(used.has(row.username), false);
    assert.notEqual(row.username, 'happydeltoid');
    assert.match(row.password, /[A-Z]/);
    assert.match(row.password, /[a-z]/);
    assert.match(row.password, /[0-9]/);
    assert.match(row.password, /[!#@$]/);
    validateStudentInput({ ...row, course_ids: [], is_active: true }, { creating: true });
  }
  for (const count of [0, 51, -1, 1.5, NaN]) assert.throws(() => generateStudentCredentials(count));
});

test('partial batch retries preserve credentials and skip created accounts and collisions', async () => {
  const rows = generateStudentCredentials(3);
  const updates = [], calls = [];
  const first = await registerStudentBatch(rows, {
    listStudents: async () => [{ username: rows[0].username }], courseIds: ['course1'],
    createStudent: async payload => {
      calls.push(payload);
      assert.deepEqual(payload.course_ids, ['course1']);
      assert.equal(payload.is_active, true);
      if (payload.username === rows[2].username) throw new Error('Temporal');
      return { id: 'created-id' };
    }, onUpdate: row => updates.push(row)
  });
  assert.deepEqual(first.map(row => row.status), ['error', 'created', 'error']);
  assert.equal(calls.length, 2);
  assert.equal(updates.length, 3);
  calls.length = 0;
  const second = await registerStudentBatch(first, {
    listStudents: async () => [{ username: rows[0].username }, { username: rows[1].username }],
    createStudent: async payload => { calls.push(payload); return { id: 'second-id' }; }
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].password, rows[2].password);
  assert.deepEqual(second.map(row => row.status), ['error', 'created', 'created']);
  const exported = credentialsText(second);
  assert.equal(exported.includes(rows[0].password), false);
  assert.equal(exported.includes(rows[1].password), true);
  assert.equal(exported.includes(rows[2].password), true);
});

test('failure to list accounts prevents all creation; ambiguous creation is not exported as success', async () => {
  const rows = generateStudentCredentials(1);
  await assert.rejects(registerStudentBatch(rows, {
    listStudents: async () => { throw new Error('Sin acceso'); },
    createStudent: async () => assert.fail('Must not create')
  }));
  const result = await registerStudentBatch(rows, { listStudents: async () => [], createStudent: async () => ({}) });
  assert.equal(result[0].status, 'error');
  assert.equal(credentialsText(result), 'Usuario\tContraseña');
});
