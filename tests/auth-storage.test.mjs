import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthStorage, createIndexedAuthStore } from '../src/lib/auth-storage.js';

const key = 'sb-dtverrtjnivamclkmhei-auth-token';

test('IndexedDB writes wait for commit and reject transaction aborts', async () => {
  let transaction, request;
  let closed = 0;
  const indexedDB = { open() {
    const opening = {};
    queueMicrotask(() => {
      opening.result = { close() { closed++; }, transaction() {
        transaction = { objectStore: () => ({ put() { request = { result: key }; return request; } }) };
        return transaction;
      } };
      opening.onsuccess();
    });
    return opening;
  } };
  const store = createIndexedAuthStore(indexedDB);
  let saved = false;
  const pending = store.setItem(key, 'session').then(() => { saved = true; });
  await Promise.resolve();
  assert.equal(saved, false);
  transaction.oncomplete();
  await pending;
  assert.equal(saved, true);
  assert.equal(closed, 1);
  const aborted = store.setItem(key, 'refresh');
  await Promise.resolve();
  transaction.error = new Error('QuotaExceededError');
  transaction.onabort();
  await assert.rejects(aborted, /QuotaExceededError/);
  assert.equal(closed, 2);
});
function fixture() {
  const data = new Map();
  const local = new Map([['app_quizzes', 'questions'], ['app_quiz_attempts', 'unsynced answers']]);
  const persistent = { getItem: async key => data.get(key), setItem: async (key, value) => { data.set(key, value); } };
  const legacy = () => ({ getItem: key => local.get(key) ?? null, removeItem: key => local.delete(key),
    setItem() { throw new DOMException('Full', 'QuotaExceededError'); } });
  return { data, local, persistent, legacy, storage: createAuthStorage({ persistent, legacy }) };
}

test('full localStorage does not prevent login, refresh or restoring a session', async () => {
  const f = fixture();
  await f.storage.setItem(key, 'session');
  await f.storage.setItem(key, 'refreshed-session');
  const reloaded = createAuthStorage(f);
  assert.equal(await reloaded.getItem(key), 'refreshed-session');
  assert.equal(f.local.get('app_quizzes'), 'questions');
  assert.equal(f.local.get('app_quiz_attempts'), 'unsynced answers');
});

test('migrates existing sessions only after durable persistence', async () => {
  const f = fixture();
  f.local.set(key, 'old-session');
  f.persistent.setItem = async () => { throw new Error('Disk unavailable'); };
  await assert.rejects(f.storage.getItem(key));
  assert.equal(f.local.get(key), 'old-session');
  f.persistent.setItem = async (key, value) => f.data.set(key, value);
  assert.equal(await f.storage.getItem(key), 'old-session');
  assert.equal(f.local.has(key), false);
  assert.equal(f.data.get(key), 'old-session');
});

test('logout cannot resurrect stale legacy credentials, including across tabs', async () => {
  const f = fixture();
  f.local.set(key, 'stale-session');
  const legacy = () => ({ getItem: key => f.local.get(key), removeItem() { throw new Error('Blocked'); } });
  const first = createAuthStorage({ persistent: f.persistent, legacy });
  await first.removeItem(key);
  const second = createAuthStorage({ persistent: f.persistent, legacy });
  assert.equal(await second.getItem(key), null);
  await second.setItem(key, 'new-session');
  assert.equal(await first.getItem(key), 'new-session');
});
