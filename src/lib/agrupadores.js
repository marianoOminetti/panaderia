/**
 * Agrupación de ventas e ítems: por receta, por transaccion_id, grupos con total y estado.
 * Usado por Ventas (lista, cobro, edición), Analytics, Dashboard.
 */
/** Agrupa ítems de una transacción por receta (suma cantidades) */
export function agregarItemsPorReceta(items) {
  if (!items || items.length === 0) return [];
  const porReceta = {};
  for (const v of items) {
    if (!v || v.receta_id == null) continue;
    const rid = String(v.receta_id);
    if (!porReceta[rid]) {
      porReceta[rid] = {
        ...v,
        receta_id: v.receta_id,
        cantidad: 0,
        id: v.id,
        // Preservar join de Supabase si vino en el select
        receta_nombre: v.receta?.nombre || v.receta_nombre || null,
        receta_emoji: v.receta?.emoji || v.receta_emoji || null,
      };
    }
    porReceta[rid].cantidad += Number(v.cantidad) || 0;
    if (v.estado_pago === "debe") porReceta[rid].estado_pago = "debe";
    if (!porReceta[rid].receta_nombre && v.receta?.nombre) {
      porReceta[rid].receta_nombre = v.receta.nombre;
      porReceta[rid].receta_emoji = v.receta.emoji || null;
    }
  }
  return Object.values(porReceta);
}

/** Agrupa ventas por transaccion_id o individuales */
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
  /** Ordenar por fecha de venta (la que se muestra y se puede editar), no por created_at */
  function fechaOrdenable(grupo) {
    const raw = grupo.rawItems?.[0] || grupo.items?.[0];
    if (!raw) return "";
    const fecha = raw.fecha;
    if (fecha && String(fecha).length >= 10) {
      return `${String(fecha).slice(0, 10)}T12:00:00`;
    }
    return raw.created_at || "";
  }
  return grupos.sort((a, b) => {
    const aTime = fechaOrdenable(a);
    const bTime = fechaOrdenable(b);
    const cmp = bTime.localeCompare(aTime);
    if (cmp !== 0) return cmp;
    const aCreated = a.rawItems?.[0]?.created_at || "";
    const bCreated = b.rawItems?.[0]?.created_at || "";
    return bCreated.localeCompare(aCreated);
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
    const total = items.reduce((s, i) => {
      const bruto = (i.precio_unitario || 0) * (i.cantidad || 0);
      const descuento = Number(i.descuento) || 0;
      return s + Math.max(0, bruto - descuento);
    }, 0);
    const senia = base.senia || 0;
    const clienteJoin = base.cliente || null;
    return {
      key: pid,
      items: agregados.length > 0 ? agregados : items,
      rawItems: items,
      total,
      senia,
      estado: base.estado || "pendiente",
      fecha_entrega: base.fecha_entrega || null,
      hora_entrega: base.hora_entrega || null,
      notas: base.notas || null,
      cliente_id: base.cliente_id ?? clienteJoin?.id ?? null,
      cliente_nombre: clienteJoin?.nombre || null,
      venta_transaccion_id: base.venta_transaccion_id || null,
    };
  });
  return grupos.sort((a, b) => {
    const aDate = a.fecha_entrega || "";
    const bDate = b.fecha_entrega || "";
    return aDate.localeCompare(bDate);
  });
}

