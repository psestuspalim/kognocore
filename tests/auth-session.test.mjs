import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { readAdminSession } from '../src/lib/admin-session.js';

const token = (exp = new Date(Date.now() + 60000).toISOString()) => `adm.${Buffer.from(JSON.stringify({ sub: 'admin', user: 'administrador', exp })).toString('base64url')}.signature`;
function storage(value) {
  const data = new Map(value ? [['kc_admin_token', value]] : []);
  return { getItem: k => data.get(k), removeItem: k => data.delete(k), setItem: (k, v) => data.set(k, v) };
}

test('restores valid administrator UI identity and rejects malformed or expired sessions', () => {
  assert.equal(readAdminSession(storage(token())).role, 'admin');
  for (const value of [token('invalid'), token('2020-01-01'), 'adm.bad.signature']) {
    const store = storage(value);
    assert.equal(readAdminSession(store), null);
    assert.equal(store.getItem('kc_admin_token'), undefined);
  }
});

test('Supabase initial and stale student events cannot log out or replace a local administrator', async () => {
  const store = storage(token());
  const states = [];
  const effects = [];
  let callback;
  const context = vm.createContext({
    localStorage: store,
    readAdminSession: () => readAdminSession(store),
    useState: initial => { const slot = states.length; states.push(initial); return [initial, value => { states[slot] = value; }]; },
    useRef: () => ({ current: null }), useCallback: fn => fn, useEffect: fn => effects.push(fn),
    window: { location: { hash: '' }, setTimeout: fn => fn() },
    supabase: { auth: {
      getSession: () => { throw new Error('Local administrator must take precedence'); },
      onAuthStateChange: fn => { callback = fn; return { data: { subscription: { unsubscribe() {} } } }; }
    } }
  });
  const source = readFileSync(new URL('../src/lib/AuthContext.jsx', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
  const body = source.split('export const AuthProvider = ({ children }) => {')[1].split('\n  return (\n')[0];
  vm.runInContext(`(() => { ${body} })()`, context);
  effects[0]();
  await Promise.resolve();
  assert.equal(states[0].role, 'admin');
  callback('INITIAL_SESSION', null);
  callback('SIGNED_OUT', null);
  callback('TOKEN_REFRESHED', { user: { id: 'previous-student' } });
  await Promise.resolve();
  assert.equal(states[0].role, 'admin');
  assert.equal(states[1], false);
});

test('catalog returns only assigned courses and surfaces database failures', async () => {
  const source = readFileSync(new URL('../api/catalog.mjs', import.meta.url), 'utf8').replace(/^import .*;\n/, '').replaceAll('export async function', 'async function');
  const calls = [];
  let failure = false;
  const query = {
    select: () => query, eq: () => query,
    in: (column, ids) => { calls.push([column, ids]); return query; },
    then: resolve => resolve(failure ? { error: {} } : { data: [{ id: 'assigned', payload: { name: 'Curso' } }] })
  };
  const actor = { kind: 'student', courseIds: ['assigned'] };
  const context = vm.createContext({ Response, URL, requireDataActor: async () => ({ actor, supabase: { from: () => query } }) });
  vm.runInContext(source, context);
  const req = new Request('https://example.test/api/catalog?kind=Course');
  const response = await context.GET(req);
  assert.deepEqual(await response.json(), { items: [{ id: 'assigned', name: 'Curso' }] });
  assert.deepEqual(calls[0], ['id', ['assigned']]);
  actor.courseIds = [];
  assert.deepEqual(await (await context.GET(req)).json(), { items: [] });
  actor.courseIds = ['assigned'];
  failure = true;
  assert.equal((await context.GET(req)).status, 500);
});
