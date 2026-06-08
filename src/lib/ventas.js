/**
 * Utilidades para ventas: IDs de transacción, merge optimista, etc.
 */
export function generateTransaccionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** IDs locales del guardado optimista; no son UUID de Supabase. */
export function isPendingVentaId(id) {
  if (id == null) return false;
  const s = String(id);
  return s.startsWith("pending-") || s.startsWith("pending-edit-");
}

function asVentasArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Fusiona ventas del servidor con estado local sin duplicar filas optimistas.
 * Si el fetch ya trae una transaccion_id, descarta pending-* locales de esa transacción.
 */
export function mergeVentasFromFetch(prev, fetched) {
  const list = asVentasArray(fetched);
  const fetchedIds = new Set(list.map((v) => v.id).filter(Boolean));
  const fetchedTransacciones = new Set(
    list.map((v) => v.transaccion_id).filter(Boolean),
  );
  const localOnly = asVentasArray(prev).filter((v) => {
    if (!v.id || fetchedIds.has(v.id)) return false;
    if (
      isPendingVentaId(v.id) &&
      v.transaccion_id &&
      fetchedTransacciones.has(v.transaccion_id)
    ) {
      return false;
    }
    return true;
  });
  return [...localOnly, ...list];
}

/**
 * Reemplaza filas pending de una transacción por las insertadas en Supabase (estado + cache).
 */
export function resolveOptimisticVentasState(prev, transaccionId, inserted, pendingIds = []) {
  const pendingSet = new Set(pendingIds || []);
  const insertedArr = asVentasArray(inserted);
  const insertedIds = new Set(insertedArr.map((v) => v.id).filter(Boolean));
  const kept = asVentasArray(prev).filter((v) => {
    if (pendingSet.has(v.id)) return false;
    if (
      transaccionId &&
      isPendingVentaId(v.id) &&
      v.transaccion_id === transaccionId
    ) {
      return false;
    }
    if (insertedIds.has(v.id)) return false;
    return true;
  });
  return [...insertedArr, ...kept];
}

/** Quita filas pending-* cuando ya hay ventas reales con la misma transaccion_id (cache envenenado). */
export function dedupeOptimisticVentas(ventas) {
  const list = asVentasArray(ventas);
  const realTransacciones = new Set(
    list
      .filter((v) => !isPendingVentaId(v.id) && v.transaccion_id)
      .map((v) => v.transaccion_id),
  );
  return list.filter((v) => {
    if (
      isPendingVentaId(v.id) &&
      v.transaccion_id &&
      realTransacciones.has(v.transaccion_id)
    ) {
      return false;
    }
    return true;
  });
}
