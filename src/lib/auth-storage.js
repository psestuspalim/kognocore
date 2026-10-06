// Keep authentication out of localStorage's small quota, shared with quiz data.
export function createIndexedAuthStore(indexedDB) {
  const transact = (method, key, value) => new Promise((resolve, reject) => {
    const opening = indexedDB.open('kognocore-auth', 1);
    opening.onupgradeneeded = () => opening.result.createObjectStore('sessions');
    opening.onerror = () => reject(opening.error);
    opening.onblocked = () => reject(new Error('Cierra las otras pestañas de la plataforma y vuelve a intentar.'));
    opening.onsuccess = () => {
      const db = opening.result;
      db.onversionchange = () => db.close();
      try {
        const transaction = db.transaction('sessions', method === 'get' ? 'readonly' : 'readwrite');
        const store = transaction.objectStore('sessions');
        const request = method === 'get' ? store.get(key) : store.put(value, key);
        // A successful request can still be rolled back: wait for commit.
        transaction.oncomplete = () => { db.close(); resolve(request.result); };
        transaction.onabort = transaction.onerror = () => {
          db.close(); reject(transaction.error || new Error('No se pudo guardar la sesión.'));
        };
      } catch (error) { db.close(); reject(error); }
    };
  });
  return { getItem: key => transact('get', key), setItem: (key, value) => transact('put', key, value) };
}

export function createAuthStorage({ persistent, legacy }) {
  const readLegacy = key => { try { return legacy()?.getItem(key) ?? null; } catch { return null; } };
  const removeLegacy = key => { try { legacy()?.removeItem(key); } catch { /* IndexedDB remains authoritative. */ } };
  return {
    async getItem(key) {
      const value = await persistent.getItem(key);
      // null is an explicit logout tombstone; undefined means not migrated yet.
      if (value !== undefined) return value;
      const previous = readLegacy(key);
      if (previous !== null) {
        await persistent.setItem(key, previous);
        removeLegacy(key);
      }
      return previous;
    },
    async setItem(key, value) {
      await persistent.setItem(key, value);
      removeLegacy(key);
    },
    async removeItem(key) {
      await persistent.setItem(key, null);
      removeLegacy(key);
    }
  };
}

export function browserAuthStorage() {
  if (typeof indexedDB === 'undefined') return undefined;
  return createAuthStorage({ persistent: createIndexedAuthStore(indexedDB), legacy: () => globalThis.localStorage });
}
