import { formatFechaLocal } from "./dates";
import {
  facturaFueRefacturada,
  getTransaccionIdFromGrupo,
} from "./facturaFiscal";
import { generateTransaccionId, isPendingVentaId } from "./ventas";

function notaCreditoActiva(notaCredito) {
  return (
    !!notaCredito?.cae &&
    (notaCredito.estado === "autorizada" || notaCredito.estado === "mock")
  );
}

export function grupoEstadoPago(grupo) {
  const items = grupo?.rawItems || [];
  if (items.some((v) => v.estado_pago === "debe")) return "debe";
  return "pagado";
}

/** Sin factura vigente, o NC activa que anuló (sin refacturación posterior). */
export function transaccionLiberadaParaUnificar(factura, notaCredito) {
  if (factura?.estado === "pendiente") return false;
  if (!factura?.cae) return true;
  if (facturaFueRefacturada(factura, notaCredito)) return false;
  if (notaCreditoActiva(notaCredito)) return true;
  return false;
}

export function motivoBloqueoUnificar(
  grupo,
  facturasByTransaccion,
  notasCreditoByTransaccion,
  unificacionesActivasByTransaccion,
) {
  if ((grupo.rawItems || []).some((v) => isPendingVentaId(v.id))) {
    return "Pendiente de sincronizar";
  }
  const transaccionId = getTransaccionIdFromGrupo(grupo);
  if (
    transaccionId &&
    unificacionesActivasByTransaccion?.get?.(transaccionId)
  ) {
    return "Ventas ya unificadas — separalas antes de volver a unificar";
  }
  const factura = transaccionId ? facturasByTransaccion?.[transaccionId] : null;
  const notaCredito = transaccionId ? notasCreditoByTransaccion?.[transaccionId] : null;
  if (transaccionLiberadaParaUnificar(factura, notaCredito)) return null;
  if (factura?.estado === "pendiente") return "Factura AFIP en proceso";
  if (facturaFueRefacturada(factura, notaCredito)) {
    return "Tiene factura AFIP nueva emitida";
  }
  if (factura?.cae && notaCredito?.estado === "pendiente") {
    return "Nota de crédito pendiente";
  }
  if (factura?.cae) return "Factura AFIP vigente";
  return "No se puede unificar";
}

export function grupoPuedeUnificar(
  grupo,
  facturasByTransaccion,
  notasCreditoByTransaccion,
  unificacionesActivasByTransaccion,
) {
  const reason = motivoBloqueoUnificar(
    grupo,
    facturasByTransaccion,
    notasCreditoByTransaccion,
    unificacionesActivasByTransaccion,
  );
  if (reason) return { ok: false, reason };
  return { ok: true };
}

export function motivoBloqueoSeparar(
  transaccionId,
  facturasByTransaccion,
  notasCreditoByTransaccion,
) {
  if (!transaccionId) return "Sin transacción";
  const factura = facturasByTransaccion?.[transaccionId];
  const notaCredito = notasCreditoByTransaccion?.[transaccionId];
  if (transaccionLiberadaParaUnificar(factura, notaCredito)) return null;
  if (factura?.estado === "pendiente") return "Factura AFIP en proceso";
  if (facturaFueRefacturada(factura, notaCredito)) {
    return "Tiene factura AFIP nueva emitida";
  }
  if (factura?.cae && notaCredito?.estado === "pendiente") {
    return "Nota de crédito pendiente";
  }
  if (factura?.cae) return "Factura AFIP vigente en esta venta";
  return "No se puede separar";
}

export function validarUnificacion({
  grupos,
  facturasByTransaccion = {},
  notasCreditoByTransaccion = {},
  unificacionesActivasByTransaccion,
}) {
  if (!grupos?.length || grupos.length < 2) {
    return { ok: false, reason: "Seleccioná al menos 2 ventas" };
  }
  const estados = new Set(grupos.map(grupoEstadoPago));
  if (estados.size > 1) {
    return {
      ok: false,
      reason: "No se pueden mezclar ventas pagadas con ventas en debe",
    };
  }
  for (const grupo of grupos) {
    const check = grupoPuedeUnificar(
      grupo,
      facturasByTransaccion,
      notasCreditoByTransaccion,
      unificacionesActivasByTransaccion,
    );
    if (!check.ok) return check;
  }
  return { ok: true, estadoPago: [...estados][0] };
}

export function elegirTransaccionDestino(grupos) {
  const sorted = [...grupos].sort((a, b) => {
    const fa = a.rawItems?.[0]?.fecha || a.rawItems?.[0]?.created_at || "";
    const fb = b.rawItems?.[0]?.fecha || b.rawItems?.[0]?.created_at || "";
    return String(fb).localeCompare(String(fa));
  });
  return getTransaccionIdFromGrupo(sorted[0]) || generateTransaccionId();
}

function ventaFechaDia(venta) {
  const f = venta?.fecha;
  if (f && String(f).length >= 10) return String(f).slice(0, 10);
  const c = venta?.created_at;
  if (c) return String(c).slice(0, 10);
  return null;
}

/** Precio de lista (como ticket de ventas), no total_final post-promo. */
function lineaMontoLista(item) {
  return (Number(item.precio_unitario) || 0) * (Number(item.cantidad) || 0);
}

function montoCobrado(item) {
  return item.total_final != null
    ? Number(item.total_final) || 0
    : lineaMontoLista(item);
}

function buildLineaItem(item, recetas) {
  const receta = recetas?.find((r) => r.id === item.receta_id);
  const precio = Number(item.precio_unitario) || 0;
  return {
    receta_id: item.receta_id,
    receta: receta ? { nombre: receta.nombre, emoji: receta.emoji } : null,
    nombre: receta?.nombre || "Producto",
    cantidad: item.cantidad,
    precio_unitario: precio,
    _lineTotal: precio * (Number(item.cantidad) || 0),
    fechaDia: ventaFechaDia(item),
  };
}

function descuentoLabelUnificado(rawItems, promociones, descuento) {
  if (!(descuento > 0)) return undefined;
  const promoIds = [
    ...new Set(
      (rawItems || []).map((r) => r.promocion_id).filter(Boolean).map(String),
    ),
  ];
  const nombres = promoIds
    .map((id) => (promociones || []).find((p) => String(p.id) === id)?.nombre)
    .filter(Boolean);
  if (nombres.length === 1) return `Promo: ${nombres[0]}`;
  if (nombres.length > 1) return `Promos: ${nombres.join(", ")}`;
  return "Descuento";
}

/** Resumen para modal y ticket: ítems a precio lista + descuento agregado (como el resto de la app). */
export function buildResumenUnificacion(grupos, recetas, promociones = []) {
  const items = [];
  const fechaSet = new Set();
  const rawItems = [];
  let totalCobrado = 0;

  for (const grupo of grupos) {
    for (const raw of grupo.rawItems || []) {
      rawItems.push(raw);
      const linea = buildLineaItem(raw, recetas);
      items.push(linea);
      totalCobrado += montoCobrado(raw);
      if (linea.fechaDia) fechaSet.add(linea.fechaDia);
    }
  }

  const subtotal = items.reduce((s, it) => s + (Number(it._lineTotal) || 0), 0);
  const total = totalCobrado;
  const descuento = Math.max(0, subtotal - total);
  const descuentoLabel = descuentoLabelUnificado(
    rawItems,
    promociones,
    descuento,
  );
  const multipleFechas = fechaSet.size > 1;
  const fechasOrdenadas = [...fechaSet].sort();

  const seccionesPorFecha = multipleFechas
    ? fechasOrdenadas.map((fechaDia) => ({
        fechaDia,
        fechaLabel: formatFechaLocal(fechaDia, { weekday: true }),
        items: items.filter((it) => it.fechaDia === fechaDia),
      }))
    : null;

  const ventaIds = grupos
    .flatMap((g) => (g.rawItems || []).map((v) => v.id))
    .filter((id) => id && !isPendingVentaId(id));

  const transaccionIds = [
    ...new Set(grupos.map(getTransaccionIdFromGrupo).filter(Boolean)),
  ];

  const estadoPago = grupoEstadoPago(grupos[0]);
  const fechaUnica = fechasOrdenadas.length === 1 ? fechasOrdenadas[0] : null;

  return {
    items,
    seccionesPorFecha,
    multipleFechas,
    fechaUnica,
    subtotal,
    descuento,
    descuentoLabel,
    total,
    ventaIds,
    transaccionIds,
    estadoPago,
  };
}

export function buildShareDataUnificado({ clienteNombre, resumen }) {
  return {
    cliente: clienteNombre,
    estado_pago: resumen.estadoPago,
    fecha: resumen.fechaUnica,
    multipleFechas: resumen.multipleFechas,
    seccionesPorFecha: resumen.seccionesPorFecha,
    items: resumen.items,
    subtotal: resumen.subtotal ?? resumen.total,
    descuento: resumen.descuento || 0,
    descuentoLabel: resumen.descuentoLabel,
    total: resumen.total,
  };
}

/** Snapshot de cada fila antes de unificar (para auditoría / deshacer). */
export function buildLineasAuditoria(ventaIds, ventas) {
  const uniqueIds = [...new Set((ventaIds || []).filter(Boolean))];
  return uniqueIds.map((id) => {
    const v = (ventas || []).find((x) => x.id === id);
    if (!v) {
      throw new Error(`Venta no encontrada (${id})`);
    }
    return {
      venta_id: id,
      transaccion_id_origen: v.transaccion_id ?? null,
      estado_pago_origen: v.estado_pago || "pagado",
      medio_pago_origen: v.medio_pago ?? null,
    };
  });
}

/** Preview de cuántas visitas quedan al deshacer una unificación. */
export function buildPreviewSeparar(lineas, ventas, recetas) {
  const porOrigen = new Map();
  for (const linea of lineas || []) {
    const origen =
      linea.transaccion_id_origen ?? `suelta:${linea.venta_id}`;
    if (!porOrigen.has(origen)) {
      porOrigen.set(origen, {
        transaccionId: linea.transaccion_id_origen,
        items: [],
        total: 0,
        fechaRaw: null,
      });
    }
    const v = (ventas || []).find((x) => x.id === linea.venta_id);
    if (!v) continue;
    const receta = recetas?.find((r) => r.id === v.receta_id);
    const monto =
      v.total_final != null
        ? v.total_final
        : (v.precio_unitario || 0) * (v.cantidad || 0);
    const fechaRaw = v.fecha ? String(v.fecha).slice(0, 10) : null;
    const grupo = porOrigen.get(origen);
    grupo.items.push({
      receta,
      nombre: receta?.nombre || "Producto",
      cantidad: v.cantidad,
      monto,
      fechaRaw,
    });
    grupo.total += monto;
    if (!grupo.fechaRaw && fechaRaw) grupo.fechaRaw = fechaRaw;
  }

  const visitas = [...porOrigen.values()]
    .map((g) => ({
      ...g,
      fechaLabel: g.fechaRaw
        ? formatFechaLocal(g.fechaRaw, { weekday: true })
        : "Sin fecha",
    }))
    .sort((a, b) => String(b.fechaRaw || "").localeCompare(String(a.fechaRaw || "")));

  return {
    visitas,
    cantidadVisitas: visitas.length,
    total: visitas.reduce((s, v) => s + v.total, 0),
  };
}

export function indexUnificacionesActivas(unificaciones) {
  const map = new Map();
  for (const u of unificaciones || []) {
    if (u.transaccion_id_destino) {
      map.set(u.transaccion_id_destino, u);
    }
  }
  return map;
}
