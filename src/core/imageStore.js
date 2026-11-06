// File: src/core/imageStore.js
// 差し替えた一枚絵を、ブラウザの IndexedDB に保存する。
const DB_NAME = 'dungeonGame.images';
const STORE = 'portraits';
let dbPromise = null;

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run(mode, fn) {
  dbPromise ??= open().catch((error) => {
    dbPromise = null;
    throw error;
  });
  return dbPromise.then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

export const putImage = (id, blob) => run('readwrite', (s) => s.put(blob, id));
export const getImage = (id) => run('readonly', (s) => s.get(id));
export const deleteImage = (id) => run('readwrite', (s) => s.delete(id));