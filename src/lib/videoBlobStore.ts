// Stores the raw video blob for each project in the browser's IndexedDB.
//
// Video files are far too large to put in Postgres, and the whole editing
// pipeline runs client-side anyway — so the blob lives on-device, keyed by the
// project id, while only the transcript + edits are persisted to the server.
// If the blob is missing (e.g. the project is opened on another machine), the
// editor prompts the user to re-attach the original file.

const DB_NAME = 'video-studio';
const STORE = 'videos';
const VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = run(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => db.close();
      })
  );
}

export async function saveVideoBlob(projectId: string, blob: Blob): Promise<void> {
  await tx('readwrite', (store) => store.put(blob, projectId));
}

export async function getVideoBlob(projectId: string): Promise<Blob | null> {
  const result = await tx<Blob | undefined>('readonly', (store) => store.get(projectId));
  return result ?? null;
}

export async function deleteVideoBlob(projectId: string): Promise<void> {
  await tx('readwrite', (store) => store.delete(projectId));
}

export async function hasVideoBlob(projectId: string): Promise<boolean> {
  const key = await tx<IDBValidKey | undefined>('readonly', (store) => store.getKey(projectId));
  return key !== undefined;
}
