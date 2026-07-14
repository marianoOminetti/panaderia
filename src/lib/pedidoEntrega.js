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

/** Firma estable: receta_id → cantidad agregada (2 decimales). */
export function fingerprintCantidadesPorReceta(items) {
  const map = new Map();
  for (const it of items || []) {
    const rid = it.receta_id;
    if (rid == null) continue;
    const c = Number(it.cantidad) || 0;
    if (c <= 0) continue;
    map.set(rid, (map.get(rid) || 0) + c);
  }
  return [...map.entries()]
    .map(([rid, c]) => [String(rid), Number(Number(c).toFixed(2))])
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([rid, c]) => `${rid}:${c}`)
    .join("|");
}

function daysBetweenFecha(a, b) {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return null;
  return Math.abs(ta - tb) / 86400000;
}

/**
 * Matching heurístico para entregas previas (sin venta_transaccion_id):
 * misma firma de productos/cantidades + mismo cliente, priorizando fecha cercana a entrega.
 */
export function matchVentasLegacyAPedido(grupo, ventasCandidatas) {
  const target = fingerprintCantidadesPorReceta(grupo?.rawItems || grupo?.items);
  if (!target) return null;

  const clienteId = grupo?.cliente_id || null;
  const byTx = new Map();
  for (const v of ventasCandidatas || []) {
    if (!v?.transaccion_id) continue;
    if (clienteId) {
      if (v.cliente_id !== clienteId) continue;
    }
    if (!byTx.has(v.transaccion_id)) byTx.set(v.transaccion_id, []);
    byTx.get(v.transaccion_id).push(v);
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
      if (delta != null) score -= delta;
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

/**
 * Resuelve ventas vinculadas a un pedido entregado (local + DB).
 * 1) venta_transaccion_id / pedido_id como transaccion_id
 * 2) matching legacy: cliente + mismos productos/cantidades
 */
export async function resolveVentasParaDesentregar({
  grupo,
  ventasLocales = [],
  fetchByTransaccionId,
  fetchByClienteId,
}) {
  const linkedTx = getPedidoVentaTransaccionId(grupo);
  const candidatosTx = [];
  if (linkedTx) candidatosTx.push(linkedTx);
  if (grupo?.key && grupo.key !== linkedTx) {
    candidatosTx.push(grupo.key);
  }

  for (const tx of candidatosTx) {
    const locales = (ventasLocales || []).filter(
      (v) => v.transaccion_id && v.transaccion_id === tx,
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

  const localLegacy = matchVentasLegacyAPedido(grupo, ventasLocales);
  if (localLegacy) {
    return {
      transaccionId: localLegacy.transaccionId,
      ventas: localLegacy.ventas,
      legacy: true,
    };
  }

  if (fetchByClienteId && grupo?.cliente_id) {
    const remotas = await fetchByClienteId(grupo.cliente_id);
    const remoteLegacy = matchVentasLegacyAPedido(grupo, remotas);
    if (remoteLegacy) {
      return {
        transaccionId: remoteLegacy.transaccionId,
        ventas: remoteLegacy.ventas,
        legacy: true,
      };
    }
  }

  // Último recurso: mismas cantidades sin filtrar por cliente (solo si hay un match).
  if (fetchByClienteId == null && !grupo?.cliente_id) {
    const loose = matchVentasLegacyAPedido(
      { ...grupo, cliente_id: null },
      ventasLocales,
    );
    if (loose) {
      return {
        transaccionId: loose.transaccionId,
        ventas: loose.ventas,
        legacy: true,
      };
    }
  }

  return { transaccionId: linkedTx || grupo?.key || null, ventas: [], legacy: false };
}
