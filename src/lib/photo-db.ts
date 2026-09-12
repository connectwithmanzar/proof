const DB_NAME = "proof_photos";
const DB_VERSION = 1;
const STORE = "blobs";

export type PhotoKind = "front" | "side";

export function photoKey(id: string, kind: PhotoKind): string {
  return `${id}:${kind}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

export async function putPhoto(
  id: string,
  kind: PhotoKind,
  blob: Blob,
): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error ?? new Error("IndexedDB write failed"));
      tx.objectStore(STORE).put(blob, photoKey(id, kind));
    });
  } finally {
    db.close();
  }
}

export async function getPhoto(
  id: string,
  kind: PhotoKind,
): Promise<Blob | undefined> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).get(photoKey(id, kind));
      request.onsuccess = () => {
        const value = request.result;
        resolve(value instanceof Blob ? value : undefined);
      };
      request.onerror = () =>
        reject(request.error ?? new Error("IndexedDB read failed"));
    });
  } finally {
    db.close();
  }
}
