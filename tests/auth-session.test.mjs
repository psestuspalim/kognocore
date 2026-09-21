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

test('catalog uses the privileged backend for every operation', async () => {
  const source = readFileSync(new URL('../api/catalog.mjs', import.meta.url), 'utf8').replace(/^import .*;\r?\n/, '').replaceAll('export async function', 'async function');
  const calls = [];
  const context = vm.createContext({ forwardToAdminEdge: async (req, route) => { calls.push([req.method, route]); return Response.json({ ok: true }); } });
  vm.runInContext(source, context);
  for (const method of ['GET', 'POST', 'DELETE']) {
    assert.equal((await context[method](new Request('https://example.test/api/catalog?kind=Course', { method }))).status, 200);
  }
  assert.deepEqual(calls, [['GET', 'catalog'], ['POST', 'catalog'], ['DELETE', 'catalog']]);
});
