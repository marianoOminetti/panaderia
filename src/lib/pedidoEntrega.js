/** Filas de venta a partir de un pedido agrupado (incluye promo si viene en el pedido). */
export function buildVentaRowsFromPedido(grupo, { fecha, transaccionId }) {
  return (grupo?.rawItems || []).map((p) => {
    const precio = p.precio_unitario || 0;
    const cantidad = p.cantidad || 0;
    const subtotal = precio * cantidad;
    const descuento = Number(p.descuento) || 0;
    return {
      receta_id: p.receta_id,
      cantidad,
      precio_unitario: precio,
      subtotal,
      descuento,
      total_final: Math.max(0, subtotal - descuento),
      promocion_id: p.promocion_id || null,
      fecha,
      transaccion_id: transaccionId,
      cliente_id: p.cliente_id || null,
      medio_pago: "efectivo",
      estado_pago: "pagado",
    };
  });
}

export function buildStockDeltasFromPedidoItems(items, sign = -1) {
  return (items || [])
    .filter((p) => p.receta_id && (p.cantidad || 0) > 0)
    .map((p) => ({ receta_id: p.receta_id, delta: sign * (p.cantidad || 0) }));
}

/**
 * Preferir venta_transaccion_id guardado al entregar.
 * No asumir pedido_id === transaccion_id sin confirmar ventas.
 */
export function getPedidoVentaTransaccionId(grupo) {
  return (
    (grupo?.rawItems || []).find((p) => p.venta_transaccion_id)
      ?.venta_transaccion_id ||
    grupo?.venta_transaccion_id ||
    null
  );
}

export function withPendingVentaIds(rows, transaccionId) {
  const now = new Date().toISOString();
  return rows.map((r, i) => ({
    ...r,
    id: `pending-${transaccionId}-${i}`,
    created_at: now,
  }));
}

function sameId(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

/** Firma estable: receta_id → cantidad agregada (2 decimales). */
export function fingerprintCantidadesPorReceta(items) {
  const map = new Map();
  for (const it of items || []) {
    const rid = it.receta_id;
    if (rid == null) continue;
    const c = Number(it.cantidad) || 0;
    if (c <= 0) continue;
    const key = String(rid);
    map.set(key, (map.get(key) || 0) + c);
  }
  return [...map.entries()]
    .map(([rid, c]) => [rid, Number(Number(c).toFixed(2))])
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([rid, c]) => `${rid}:${c}`)
    .join("|");
}

function daysBetweenFecha(a, b) {
  const ta = Date.parse(`${String(a).slice(0, 10)}T12:00:00`);
  const tb = Date.parse(`${String(b).slice(0, 10)}T12:00:00`);
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return null;
  return Math.abs(ta - tb) / 86400000;
}

function addDaysISO(fechaISO, days) {
  const base = String(fechaISO || "").slice(0, 10);
  const t = Date.parse(`${base}T12:00:00`);
  if (!Number.isFinite(t)) return null;
  const d = new Date(t);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Matching heurístico para entregas previas (sin venta_transaccion_id):
 * misma firma de productos/cantidades + mismo cliente, priorizando fecha cercana a entrega.
 */
export function matchVentasLegacyAPedido(grupo, ventasCandidatas, opciones = {}) {
  const target = fingerprintCantidadesPorReceta(grupo?.rawItems || grupo?.items);
  if (!target) return null;

  const maxDeltaDays =
    opciones.maxDeltaDays === undefined ? null : opciones.maxDeltaDays;

  const clienteId = grupo?.cliente_id || null;
  const byTx = new Map();
  for (const v of ventasCandidatas || []) {
    if (!v?.transaccion_id) continue;
    if (clienteId && v.cliente_id != null && !sameId(v.cliente_id, clienteId)) {
      continue;
    }
    const tx = String(v.transaccion_id);
    if (!byTx.has(tx)) byTx.set(tx, []);
    byTx.get(tx).push(v);
  }

  const fechaEntrega = grupo?.fecha_entrega
    ? String(grupo.fecha_entrega).slice(0, 10)
    : null;
  const scored = [];

  for (const [tx, rows] of byTx.entries()) {
    if (fingerprintCantidadesPorReceta(rows) !== target) continue;
    const fecha = rows[0]?.fecha ? String(rows[0].fecha).slice(0, 10) : null;
    const created = rows[0]?.created_at || "";
    let score = 0;
    if (fechaEntrega && fecha) {
      const delta = daysBetweenFecha(fecha, fechaEntrega);
      if (delta != null) {
        if (maxDeltaDays != null && delta > maxDeltaDays) continue;
        score -= delta;
      }
      if (fecha === fechaEntrega) score += 10;
      if (fecha >= fechaEntrega) score += 2;
    }
    scored.push({
      transaccionId: tx,
      ventas: rows,
      score,
      created,
      legacy: true,
    });
  }

  if (!scored.length) return null;
  scored.sort(
    (a, b) =>
      b.score - a.score || String(b.created).localeCompare(String(a.created)),
  );
  return scored[0];
}

function mergeVentas(...lists) {
  const byId = new Map();
  for (const list of lists) {
    for (const v of list || []) {
      if (v?.id != null) byId.set(String(v.id), v);
      else if (v?.transaccion_id && v?.receta_id != null) {
        byId.set(`${v.transaccion_id}:${v.receta_id}:${v.cantidad}`, v);
      }
    }
  }
  return [...byId.values()];
}

/**
 * Resuelve ventas vinculadas a un pedido entregado (local + DB).
 * 1) venta_transaccion_id / pedido_id como transaccion_id
 * 2) matching legacy por cliente + firma de productos (ventana amplia de fechas)
 */
export async function resolveVentasParaDesentregar({
  grupo,
  ventasLocales = [],
  fetchByTransaccionId,
  fetchByClienteId,
  fetchByClienteFechaRango,
}) {
  const linkedTx = getPedidoVentaTransaccionId(grupo);
  const candidatosTx = [];
  if (linkedTx) candidatosTx.push(String(linkedTx));
  if (grupo?.key && String(grupo.key) !== String(linkedTx || "")) {
    candidatosTx.push(String(grupo.key));
  }

  for (const tx of candidatosTx) {
    const locales = (ventasLocales || []).filter(
      (v) => v.transaccion_id && sameId(v.transaccion_id, tx),
    );
    if (locales.length) {
      return { transaccionId: tx, ventas: locales, legacy: false };
    }
    if (fetchByTransaccionId) {
      const fetched = await fetchByTransaccionId(tx);
      if (fetched?.length) {
        return { transaccionId: tx, ventas: fetched, legacy: false };
      }
    }
  }

  let remoteVentas = [];
  const fechaEntrega = grupo?.fecha_entrega
    ? String(grupo.fecha_entrega).slice(0, 10)
    : null;

  if (fetchByClienteFechaRango && grupo?.cliente_id && fechaEntrega) {
    const desde = addDaysISO(fechaEntrega, -60) || fechaEntrega;
    const hasta = addDaysISO(fechaEntrega, 120) || fechaEntrega;
    remoteVentas = (await fetchByClienteFechaRango(grupo.cliente_id, desde, hasta)) || [];
  } else if (fetchByClienteId && grupo?.cliente_id) {
    remoteVentas = (await fetchByClienteId(grupo.cliente_id)) || [];
  }

  const merged = mergeVentas(ventasLocales, remoteVentas);

  // Ventana amplia primero; si no hay, el mejor match sin tope de días.
  const cerca =
    matchVentasLegacyAPedido(grupo, merged, { maxDeltaDays: 180 }) ||
    matchVentasLegacyAPedido(grupo, merged, { maxDeltaDays: null });
  if (cerca) {
    return {
      transaccionId: cerca.transaccionId,
      ventas: cerca.ventas,
      legacy: true,
    };
  }

  // Si el fetch por rango no alcanzó, ampliar con todo el historial del cliente.
  if (fetchByClienteId && grupo?.cliente_id && fetchByClienteFechaRango) {
    const todas = (await fetchByClienteId(grupo.cliente_id)) || [];
    const mergedAll = mergeVentas(merged, todas);
    const match =
      matchVentasLegacyAPedido(grupo, mergedAll, { maxDeltaDays: null });
    if (match) {
      return {
        transaccionId: match.transaccionId,
        ventas: match.ventas,
        legacy: true,
      };
    }
  }

  return {
    transaccionId: linkedTx || grupo?.key || null,
    ventas: [],
    legacy: false,
  };
}

export { addDaysISO, sameId };
