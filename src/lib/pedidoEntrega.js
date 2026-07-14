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

/**
 * Resuelve ventas vinculadas a un pedido entregado (local + DB).
 * Prueba venta_transaccion_id y, si no hay, pedido_id solo si hay filas.
 */
export async function resolveVentasParaDesentregar({
  grupo,
  ventasLocales = [],
  fetchByTransaccionId,
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
      return { transaccionId: tx, ventas: locales };
    }
    if (fetchByTransaccionId) {
      const fetched = await fetchByTransaccionId(tx);
      if (fetched?.length) {
        return { transaccionId: tx, ventas: fetched };
      }
    }
  }

  return { transaccionId: linkedTx || grupo?.key || null, ventas: [] };
}
