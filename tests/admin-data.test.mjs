import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

test('a failed legacy import does not hide server courses or overwrite unsynced local data', async () => {
  const source = readFileSync(new URL('../src/api/client.js', import.meta.url), 'utf8');
  const calls = [];
  const saved = [];
  const context = vm.createContext({
    console: { error() {} }, CATALOG_ENTITIES: ['Course', 'Subject', 'Folder'], catalogImported: new Set(),
    mockClient: { auth: { me: async () => ({ is_admin: true }) } },
    getItems: () => [{ id: 'local-only', name: 'Local' }], saveItems: (...args) => saved.push(args),
    sortByField: items => items,
    requestJson: async (url, options) => {
      calls.push([url, options?.method || 'GET']);
      if (options?.method === 'POST') throw new Error('service unavailable');
      return { items: [{ id: 'server-course', name: 'Existing' }] };
    }
  });
  const fragment = source.slice(source.indexOf('        list: async (orderBy)'), source.indexOf('        filter: async (criteria'));
  const entity = vm.runInContext(`(() => { const entityName = 'Course'; return { ${fragment} }; })()`, context);
  assert.equal((await entity.list())[0].id, 'server-course');
  assert.equal(calls.at(-1)[1], 'GET');
  assert.equal(saved.length, 0);
});

test('edge administrator checks use verified identity, never an unrelated data listing', async () => {
  let handler;
  let role = 'user';
  const calls = [];
  const source = readFileSync(new URL('../supabase/functions/kognocore-admin/index.ts', import.meta.url), 'utf8').replace(/^import .*;\r?\n/, '');
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  const context = vm.createContext({
    Response, URL, console,
    Deno: { env: { get: () => 'configured' }, serve: fn => { handler = fn; } },
    createClient: () => ({ auth: { admin: { listUsers: async () => ({ data: { users: [] } }) } } }),
    fetch: async url => { calls.push(url); return Response.json({ user: { role } }); }
  });
  vm.runInContext(code, context);
  const request = () => new Request('https://example.test?route=students', { headers: { Authorization: 'Bearer test' } });
  assert.equal((await handler(request())).status, 403);
  role = 'admin';
  assert.equal((await handler(request())).status, 200);
  assert.ok(calls.every(url => url.endsWith('/api/me')));
  assert.equal((await handler(new Request('https://example.test?route=students'))).status, 403);
});

test('privileged catalog scopes students, supports code sessions and rejects expired or suspended access', async () => {
  let handler;
  let identity;
  let dbFailure = false;
  const filters = [];
  const query = {
    select: () => query, eq: () => query,
    in: (column, ids) => { filters.push([column, [...ids]]); return query; },
    then: resolve => resolve(dbFailure ? { error: { code: '42501' } } : { data: [{ id: 'course-a', payload: { name: 'Curso' } }] })
  };
  const source = readFileSync(new URL('../supabase/functions/kognocore-admin/index.ts', import.meta.url), 'utf8').replace(/^import .*;\r?\n/, '');
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  vm.runInNewContext(code, {
    Response, URL, console,
    Deno: { env: { get: () => 'configured' }, serve: fn => { handler = fn; } },
    createClient: () => ({ from: () => query }),
    fetch: async () => identity ? Response.json(identity) : Response.json({ error: 'expired' }, { status: 401 })
  });
  const request = (route = 'catalog&kind=Course') => new Request(`https://example.test?route=${route}`, { headers: { Authorization: 'Bearer test' } });
  identity = { user: { role: 'admin' } };
  assert.equal((await handler(request())).status, 200);
  assert.equal(filters.length, 0);
  identity = { user: { managed_student: true, is_active: true, course_ids: ['course-a'], id: 'student', learner_id: 'user_student' } };
  assert.equal((await handler(request())).status, 200);
  assert.deepEqual(filters.at(-1), ['id', ['course-a']]);
  const enrolled = await (await handler(request('enrollments'))).json();
  assert.equal(enrolled.enrollments[0].learner_id, 'user_student');
  identity.user.course_ids = [];
  assert.deepEqual(await (await handler(request())).json(), { items: [] });
  identity.user.is_active = false;
  assert.equal((await handler(request())).status, 401);
  assert.equal((await handler(request('enrollments'))).status, 403);
  identity = { courseId: 'course-a' };
  assert.equal((await handler(request('catalog&kind=Subject'))).status, 200);
  assert.deepEqual(filters.at(-1), ['course_id', ['course-a']]);
  dbFailure = true;
  assert.equal((await handler(request())).status, 500);
  identity = null;
  assert.equal((await handler(request())).status, 401);
});
