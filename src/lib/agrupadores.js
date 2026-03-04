/** Agrupa ítems de una transacción por receta (suma cantidades) */
export function agregarItemsPorReceta(items) {
  if (!items || items.length === 0) return [];
  const porReceta = {};
  for (const v of items) {
    if (!v || v.receta_id == null) continue;
    const rid = v.receta_id;
    if (!porReceta[rid]) {
      porReceta[rid] = { ...v, cantidad: 0, id: v.id };
    }
    porReceta[rid].cantidad += Number(v.cantidad) || 0;
    if (v.estado_pago === "debe") porReceta[rid].estado_pago = "debe";
  }
  return Object.values(porReceta);
}

/** Agrupa ventas por transaccion_id (1 venta por voz) o individuales */
export function agruparVentas(ventas) {
  const porTransaccion = {};
  const sueltas = [];
  for (const v of ventas) {
    const tid = v.transaccion_id;
    if (tid) {
      if (!porTransaccion[tid]) porTransaccion[tid] = [];
      porTransaccion[tid].push(v);
    } else {
      sueltas.push(v);
    }
  }
  const grupos = Object.entries(porTransaccion).map(([tid, items]) => {
    const agregados = agregarItemsPorReceta(items);
    return {
      key: tid,
      items: agregados.length > 0 ? agregados : items,
      rawItems: items,
      total: items.reduce(
        (s, i) =>
          s +
          (i.total_final != null
            ? i.total_final
            : (i.precio_unitario || 0) * (i.cantidad || 0)),
        0
      ),
      cliente_id: items[0]?.cliente_id
    };
  });
  for (const v of sueltas) {
    const totalLinea =
      v.total_final != null
        ? v.total_final
        : (v.precio_unitario || 0) * (v.cantidad || 0);
    grupos.push({
      key: v.id,
      items: [v],
      rawItems: [v],
      total: totalLinea,
      cliente_id: v.cliente_id,
    });
  }
  return grupos.sort((a, b) => {
    const aTime = a.items[0]?.created_at || "";
    const bTime = b.items[0]?.created_at || "";
    return bTime.localeCompare(aTime);
  });
}

/** Total adeudado en un grupo (solo ítems con estado_pago === "debe") */
export function totalDebeEnGrupo(grupo) {
  if (!grupo?.rawItems) return 0;
  return grupo.rawItems
    .filter((v) => v.estado_pago === "debe")
    .reduce(
      (s, v) =>
        s +
        (v.total_final != null
          ? v.total_final
          : (v.precio_unitario || 0) * (v.cantidad || 0)),
      0
    );
}

/** Grupos que tienen al menos un ítem con deuda, ordenados por fecha (más reciente primero) */
export function gruposConDeuda(ventas) {
  const grupos = agruparVentas(ventas || []);
  return grupos.filter((g) =>
    g.rawItems?.some((v) => v.estado_pago === "debe")
  );
}

/** Agrupa pedidos futuros por pedido_id y resume totales */
export function agruparPedidos(pedidos) {
  if (!pedidos || pedidos.length === 0) return [];
  const porPedido = {};
  for (const p of pedidos) {
    if (!p) continue;
    const pid = p.pedido_id || p.id;
    if (!pid) continue;
    if (!porPedido[pid]) porPedido[pid] = [];
    porPedido[pid].push(p);
  }
  const grupos = Object.entries(porPedido).map(([pid, items]) => {
    const agregados = agregarItemsPorReceta(items);
    const base = items[0] || {};
    const total = items.reduce(
      (s, i) => s + (i.precio_unitario || 0) * (i.cantidad || 0),
      0
    );
    const senia = base.senia || 0;
    return {
      key: pid,
      items: agregados.length > 0 ? agregados : items,
      rawItems: items,
      total,
      senia,
      estado: base.estado || "pendiente",
      fecha_entrega: base.fecha_entrega || null,
      cliente_id: base.cliente_id,
    };
  });
  return grupos.sort((a, b) => {
    const aDate = a.fecha_entrega || "";
    const bDate = b.fecha_entrega || "";
    return aDate.localeCompare(bDate);
  });
}

