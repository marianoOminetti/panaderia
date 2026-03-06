/**
 * Persistencia de ventas pendientes en IndexedDB cuando no hay conexión.
 * Usado por useSyncVentasPendientes y flujo de ventas offline.
 */
const OFFLINE_DB_NAME = "panaderia-offline";
const OFFLINE_DB_VERSION = 1;
const OFFLINE_VENTAS_STORE = "ventas_pendientes";

function openOfflineDB() {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      resolve(null);
      return;
    }
    const request = window.indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(OFFLINE_VENTAS_STORE)) {
        const store = db.createObjectStore(OFFLINE_VENTAS_STORE, {
          keyPath: "id",
        });
        store.createIndex("created_at", "created_at", { unique: false });
      }
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      resolve(null);
    };
  });
}

export async function saveVentaPendiente(rows) {
  const db = await openOfflineDB();
  if (!db) throw new Error("IndexedDB no disponible");
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_VENTAS_STORE, "readwrite");
    const store = tx.objectStore(OFFLINE_VENTAS_STORE);
    const hasCrypto =
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function";
    const id = hasCrypto
      ? crypto.randomUUID()
      : `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const record = {
      id,
      created_at: new Date().toISOString(),
      rows: Array.isArray(rows) ? rows : [],
    };
    store.put(record);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () =>
      reject(tx.error || new Error("Error al guardar venta offline"));
  });
}

export async function getVentasPendientes() {
  const db = await openOfflineDB();
  if (!db) return [];
  return new Promise((resolve) => {
    const tx = db.transaction(OFFLINE_VENTAS_STORE, "readonly");
    const store = tx.objectStore(OFFLINE_VENTAS_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}

export async function deleteVentaPendiente(id) {
  const db = await openOfflineDB();
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction(OFFLINE_VENTAS_STORE, "readwrite");
    const store = tx.objectStore(OFFLINE_VENTAS_STORE);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

