/**
 * App cache en IndexedDB: stale-while-revalidate para catálogo, ventas recientes y sesión de venta.
 */
import { fechaHaceDiasISO } from "./recetasParaVenta";
import { hoyLocalISO } from "./dates";
import { resolveOptimisticVentasState } from "./ventas";

const SESSION_DB_NAME = "panaderia-offline";
const SESSION_DB_VERSION = 3;
const CATALOG_STORE = "catalog_snapshot";
const VENTAS_RECENT_STORE = "ventas_recent";
const VENTA_SESSION_STORE = "venta_session";
const CACHE_META_STORE = "cache_meta";
const VENTAS_HISTORICAS_STORE = "ventas_historicas";

const CATALOG_TTL_MS = 5 * 60 * 1000;
const VENTAS_RECENT_TTL_MS = 15 * 60 * 1000;
const VENTAS_HISTORICAS_TTL_MS = 24 * 60 * 60 * 1000;
const VENTAS_RECENT_MAX_ROWS = 2000;
const VENTAS_RECENT_DAYS = 30;

export const APP_CACHE_VERSION = 2;

/** Histórico en cache confiable solo si se guardó con la versión actual (chunks de 3 meses). */
export function isVentasHistoricasCacheTrusted(meta) {
  return (meta?.appCacheVersion ?? 0) >= APP_CACHE_VERSION;
}

function normalizeRoleKey(roleKey) {
  return roleKey ?? "__default__";
}

function openSessionDB() {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      resolve(null);
      return;
    }
    const request = window.indexedDB.open(SESSION_DB_NAME, SESSION_DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("ventas_pendientes")) {
        const store = db.createObjectStore("ventas_pendientes", { keyPath: "id" });
        store.createIndex("created_at", "created_at", { unique: false });
      }
      if (!db.objectStoreNames.contains(CATALOG_STORE)) {
        db.createObjectStore(CATALOG_STORE, { keyPath: "roleKey" });
      }
      if (!db.objectStoreNames.contains(VENTA_SESSION_STORE)) {
        db.createObjectStore(VENTA_SESSION_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(VENTAS_RECENT_STORE)) {
        db.createObjectStore(VENTAS_RECENT_STORE, { keyPath: "roleKey" });
      }
      if (!db.objectStoreNames.contains(CACHE_META_STORE)) {
        db.createObjectStore(CACHE_META_STORE, { keyPath: "roleKey" });
      }
      if (!db.objectStoreNames.contains(VENTAS_HISTORICAS_STORE)) {
        db.createObjectStore(VENTAS_HISTORICAS_STORE, { keyPath: "roleKey" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

function getStore(db, storeName, mode) {
  return db.transaction(storeName, mode).objectStore(storeName);
}

function idbGet(store, key) {
  return new Promise((resolve) => {
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

function idbPut(store, value) {
  return new Promise((resolve) => {
    const req = store.put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
  });
}

function idbDelete(store, key) {
  return new Promise((resolve) => {
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
  });
}

export function isCacheFresh(savedAt, ttlMs) {
  if (!savedAt) return false;
  return Date.now() - savedAt < ttlMs;
}

export function trimVentasForCache(ventas, { maxRows = VENTAS_RECENT_MAX_ROWS, days = VENTAS_RECENT_DAYS } = {}) {
  const list = Array.isArray(ventas) ? ventas : [];
  const desde = fechaHaceDiasISO(hoyLocalISO(), days - 1);
  const filtered = list.filter((v) => {
    const f = v?.fecha ? String(v.fecha).slice(0, 10) : null;
    return f && f >= desde;
  });
  const sorted = [...filtered].sort((a, b) => {
    const fa = `${a.fecha || ""}T${a.created_at || ""}`;
    const fb = `${b.fecha || ""}T${b.created_at || ""}`;
    return fb.localeCompare(fa);
  });
  return sorted.slice(0, maxRows);
}

export async function getAppCache(roleKey) {
  const db = await openSessionDB();
  if (!db) return null;
  const key = normalizeRoleKey(roleKey);
  const tx = db.transaction(
    [CATALOG_STORE, VENTAS_RECENT_STORE, CACHE_META_STORE, VENTAS_HISTORICAS_STORE],
    "readonly",
  );
  const [catalog, ventasRecent, meta, ventasHistoricas] = await Promise.all([
    idbGet(tx.objectStore(CATALOG_STORE), key),
    idbGet(tx.objectStore(VENTAS_RECENT_STORE), key),
    idbGet(tx.objectStore(CACHE_META_STORE), key),
    idbGet(tx.objectStore(VENTAS_HISTORICAS_STORE), key),
  ]);
  return {
    roleKey: key,
    catalog,
    ventasRecent,
    meta,
    ventasHistoricas,
    catalogFresh: isCacheFresh(catalog?.savedAt, CATALOG_TTL_MS),
    ventasRecentFresh: isCacheFresh(ventasRecent?.savedAt, VENTAS_RECENT_TTL_MS),
    ventasHistoricasFresh: isCacheFresh(ventasHistoricas?.savedAt, VENTAS_HISTORICAS_TTL_MS),
  };
}

export async function persistAppCache(roleKey, data = {}) {
  const db = await openSessionDB();
  if (!db) return;
  const key = normalizeRoleKey(roleKey);
  const now = Date.now();
  const tx = db.transaction(
    [CATALOG_STORE, VENTAS_RECENT_STORE, CACHE_META_STORE, VENTAS_HISTORICAS_STORE],
    "readwrite",
  );

  const catalogPut = data.recetas != null || data.stock != null || data.clientes != null || data.promociones != null
    ? idbPut(tx.objectStore(CATALOG_STORE), {
        roleKey: key,
        savedAt: now,
        recetas: data.recetas,
        clientes: data.clientes,
        stock: data.stock,
        promociones: data.promociones,
      })
    : Promise.resolve();

  const ventasTrimmed = data.ventas != null ? trimVentasForCache(data.ventas) : null;
  const ventasRecentPut =
    ventasTrimmed != null
      ? idbPut(tx.objectStore(VENTAS_RECENT_STORE), {
          roleKey: key,
          savedAt: now,
          ventas: ventasTrimmed,
        })
      : Promise.resolve();

  const ventasHistPut =
    data.ventasHistoricas != null
      ? idbPut(tx.objectStore(VENTAS_HISTORICAS_STORE), {
          roleKey: key,
          savedAt: now,
          ventas: data.ventasHistoricas,
          corteReciente: data.ventasHistoricasCorte ?? null,
        })
      : Promise.resolve();

  const metaPut = idbPut(tx.objectStore(CACHE_META_STORE), {
    roleKey: key,
    lastSyncAt: now,
    appCacheVersion: APP_CACHE_VERSION,
  });

  await Promise.all([catalogPut, ventasRecentPut, ventasHistPut, metaPut]);
}

export async function patchAppCache(roleKey, partial = {}) {
  const db = await openSessionDB();
  if (!db) return;
  const key = normalizeRoleKey(roleKey);
  const now = Date.now();

  if (partial.recetas != null || partial.stock != null || partial.clientes != null || partial.promociones != null) {
    const cache = await getAppCache(key);
    const prev = cache?.catalog || { roleKey: key };
    await persistAppCache(key, {
      recetas: partial.recetas ?? prev.recetas,
      clientes: partial.clientes ?? prev.clientes,
      stock: partial.stock ?? prev.stock,
      promociones: partial.promociones ?? prev.promociones,
    });
  }

  if (partial.appendVentas?.length) {
    const cache = await getAppCache(key);
    const prevVentas = cache?.ventasRecent?.ventas || [];
    const ids = new Set(prevVentas.map((v) => v.id).filter(Boolean));
    const merged = [
      ...partial.appendVentas.filter((v) => !v.id || !ids.has(v.id)),
      ...prevVentas,
    ];
    const tx = db.transaction([VENTAS_RECENT_STORE, CACHE_META_STORE], "readwrite");
    await idbPut(tx.objectStore(VENTAS_RECENT_STORE), {
      roleKey: key,
      savedAt: now,
      ventas: trimVentasForCache(merged),
    });
    await idbPut(tx.objectStore(CACHE_META_STORE), {
      roleKey: key,
      lastSyncAt: now,
      appCacheVersion: APP_CACHE_VERSION,
    });
  }

  if (partial.removeVentasIds?.length) {
    const cache = await getAppCache(key);
    const removeSet = new Set(partial.removeVentasIds);
    const prevVentas = (cache?.ventasRecent?.ventas || []).filter((v) => !removeSet.has(v.id));
    const tx = db.transaction([VENTAS_RECENT_STORE, CACHE_META_STORE], "readwrite");
    await idbPut(tx.objectStore(VENTAS_RECENT_STORE), {
      roleKey: key,
      savedAt: now,
      ventas: prevVentas,
    });
    await idbPut(tx.objectStore(CACHE_META_STORE), {
      roleKey: key,
      lastSyncAt: now,
      appCacheVersion: APP_CACHE_VERSION,
    });
  }

  if (partial.replaceVentas?.length) {
    const cache = await getAppCache(key);
    const byId = new Map(partial.replaceVentas.filter((v) => v.id).map((v) => [v.id, v]));
    const prevVentas = cache?.ventasRecent?.ventas || [];
    const merged = prevVentas.map((v) => (byId.has(v.id) ? byId.get(v.id) : v));
    for (const row of partial.replaceVentas) {
      if (row.id && !merged.some((v) => v.id === row.id)) merged.unshift(row);
    }
    const tx = db.transaction([VENTAS_RECENT_STORE, CACHE_META_STORE], "readwrite");
    await idbPut(tx.objectStore(VENTAS_RECENT_STORE), {
      roleKey: key,
      savedAt: now,
      ventas: trimVentasForCache(merged),
    });
    await idbPut(tx.objectStore(CACHE_META_STORE), {
      roleKey: key,
      lastSyncAt: now,
      appCacheVersion: APP_CACHE_VERSION,
    });
  }

  if (partial.reassignVentasClienteId) {
    const { fromId, toId } = partial.reassignVentasClienteId;
    if (fromId && toId) {
      const mapClienteId = (ventas) =>
        (ventas || []).map((v) =>
          v.cliente_id === fromId ? { ...v, cliente_id: toId } : v,
        );
      const cache = await getAppCache(key);
      const recentVentas = mapClienteId(cache?.ventasRecent?.ventas);
      const historicVentas = cache?.ventasHistoricasFresh
        ? mapClienteId(cache?.ventasHistoricas?.ventas)
        : null;
      const tx = db.transaction(
        [VENTAS_RECENT_STORE, VENTAS_HISTORICAS_STORE, CACHE_META_STORE],
        "readwrite",
      );
      await idbPut(tx.objectStore(VENTAS_RECENT_STORE), {
        roleKey: key,
        savedAt: now,
        ventas: trimVentasForCache(recentVentas),
      });
      if (historicVentas != null) {
        await idbPut(tx.objectStore(VENTAS_HISTORICAS_STORE), {
          roleKey: key,
          savedAt: now,
          ventas: historicVentas,
          corteReciente: cache?.ventasHistoricas?.corteReciente ?? null,
        });
      }
      await idbPut(tx.objectStore(CACHE_META_STORE), {
        roleKey: key,
        lastSyncAt: now,
        appCacheVersion: APP_CACHE_VERSION,
      });
    }
  }

  if (partial.resolveOptimisticVentas) {
    const { transaccionId, inserted, pendingIds } = partial.resolveOptimisticVentas;
    const cache = await getAppCache(key);
    const prevVentas = cache?.ventasRecent?.ventas || [];
    const merged = resolveOptimisticVentasState(
      prevVentas,
      transaccionId,
      inserted,
      pendingIds,
    );
    const tx = db.transaction([VENTAS_RECENT_STORE, CACHE_META_STORE], "readwrite");
    await idbPut(tx.objectStore(VENTAS_RECENT_STORE), {
      roleKey: key,
      savedAt: now,
      ventas: trimVentasForCache(merged),
    });
    await idbPut(tx.objectStore(CACHE_META_STORE), {
      roleKey: key,
      lastSyncAt: now,
      appCacheVersion: APP_CACHE_VERSION,
    });
  }

  if (partial.stockPatch?.length) {
    const cache = await getAppCache(key);
    const prevCatalog = cache?.catalog || {};
    const nextStock = { ...(prevCatalog.stock || {}) };
    for (const { receta_id, delta } of partial.stockPatch) {
      const actual = Number(nextStock[receta_id]) || 0;
      const deltaNum = Number(delta) || 0;
      nextStock[receta_id] = Math.max(0, actual + deltaNum);
    }
    await persistAppCache(key, {
      recetas: prevCatalog.recetas,
      clientes: prevCatalog.clientes,
      stock: nextStock,
      promociones: prevCatalog.promociones,
    });
  }
}

export async function getVentasHistoricasCache(roleKey) {
  const cache = await getAppCache(roleKey);
  if (!cache?.ventasHistoricasFresh) return null;
  return cache.ventasHistoricas?.ventas || null;
}

export async function clearAppCache(roleKey) {
  const db = await openSessionDB();
  if (!db) return;
  const key = normalizeRoleKey(roleKey);
  const tx = db.transaction(
    [CATALOG_STORE, VENTAS_RECENT_STORE, CACHE_META_STORE, VENTAS_HISTORICAS_STORE],
    "readwrite",
  );
  await Promise.all([
    idbDelete(tx.objectStore(CATALOG_STORE), key),
    idbDelete(tx.objectStore(VENTAS_RECENT_STORE), key),
    idbDelete(tx.objectStore(CACHE_META_STORE), key),
    idbDelete(tx.objectStore(VENTAS_HISTORICAS_STORE), key),
  ]);
}

export async function getVentaSession() {
  const db = await openSessionDB();
  if (!db) return null;
  return idbGet(getStore(db, VENTA_SESSION_STORE, "readonly"), "current");
}

export async function persistVentaSession(session) {
  const db = await openSessionDB();
  if (!db) return;
  await idbPut(getStore(db, VENTA_SESSION_STORE, "readwrite"), {
    id: "current",
    savedAt: Date.now(),
    ...session,
  });
}

export async function clearVentaSession() {
  const db = await openSessionDB();
  if (!db) return;
  await idbDelete(getStore(db, VENTA_SESSION_STORE, "readwrite"), "current");
}
