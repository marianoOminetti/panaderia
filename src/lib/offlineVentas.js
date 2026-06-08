/**
 * Persistencia de ventas pendientes en IndexedDB cuando no hay conexión.
 * Usado por useSyncVentasPendientes y flujo de ventas offline.
 */
const OFFLINE_DB_NAME = "panaderia-offline";
const OFFLINE_DB_VERSION = 3;
const OFFLINE_VENTAS_STORE = "ventas_pendientes";
const SYNCING_STALE_MS = 5 * 60 * 1000;

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
      if (!db.objectStoreNames.contains("catalog_snapshot")) {
        db.createObjectStore("catalog_snapshot", { keyPath: "roleKey" });
      }
      if (!db.objectStoreNames.contains("venta_session")) {
        db.createObjectStore("venta_session", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("ventas_recent")) {
        db.createObjectStore("ventas_recent", { keyPath: "roleKey" });
      }
      if (!db.objectStoreNames.contains("cache_meta")) {
        db.createObjectStore("cache_meta", { keyPath: "roleKey" });
      }
      if (!db.objectStoreNames.contains("ventas_historicas")) {
        db.createObjectStore("ventas_historicas", { keyPath: "roleKey" });
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

function isSyncingStale(record) {
  if (record?.status !== "syncing") return false;
  const at = record.syncing_at || record.created_at;
  if (!at) return true;
  return Date.now() - new Date(at).getTime() > SYNCING_STALE_MS;
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
      status: "pending",
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
    req.onsuccess = () => {
      const all = req.result || [];
      resolve(
        all.filter((item) => item.status !== "syncing" || isSyncingStale(item)),
      );
    };
    req.onerror = () => resolve([]);
  });
}

export async function markVentaPendienteSyncing(id) {
  const db = await openOfflineDB();
  if (!db) return false;
  return new Promise((resolve) => {
    const tx = db.transaction(OFFLINE_VENTAS_STORE, "readwrite");
    const store = tx.objectStore(OFFLINE_VENTAS_STORE);
    const req = store.get(id);
    req.onsuccess = () => {
      const record = req.result;
      if (!record) {
        resolve(false);
        return;
      }
      store.put({
        ...record,
        status: "syncing",
        syncing_at: new Date().toISOString(),
      });
    };
    req.onerror = () => resolve(false);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
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
