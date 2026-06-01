import { toCantidadNumber } from "./format";

export const TIPOS_PROMO = {
  NXM: "nxm",
  PORCENTAJE_PRODUCTOS: "porcentaje_productos",
  PORCENTAJE_MONTO_MINIMO: "porcentaje_monto_minimo",
};

/**
 * Normaliza filas de Supabase con join promocion_recetas.
 */
export function normalizarPromociones(rows) {
  return (rows || []).map((p) => {
    const links = p.promocion_recetas || [];
    const receta_ids = links.map((l) => l.receta_id).filter(Boolean);
    const { promocion_recetas: _pr, ...rest } = p;
    return { ...rest, receta_ids };
  });
}

function subtotalCarrito(cartItems) {
  return (cartItems || []).reduce((s, it) => {
    const cant = toCantidadNumber(it.cantidad) || 0;
    return s + (Number(it.precio_unitario) || 0) * cant;
  }, 0);
}

function subtotalProductosElegibles(cartItems, recetaIdsSet) {
  return (cartItems || []).reduce((s, it) => {
    const rid = it.receta?.id;
    if (!rid || !recetaIdsSet.has(rid)) return s;
    const cant = toCantidadNumber(it.cantidad) || 0;
    return s + (Number(it.precio_unitario) || 0) * cant;
  }, 0);
}

function expandirUnidadesElegibles(cartItems, recetaIdsSet) {
  const unidades = [];
  for (const item of cartItems || []) {
    const rid = item.receta?.id;
    if (!rid || !recetaIdsSet.has(rid)) continue;
    const precio = Number(item.precio_unitario) || 0;
    const cantEntera = Math.floor(toCantidadNumber(item.cantidad) || 0);
    for (let i = 0; i < cantEntera; i++) {
      unidades.push({ receta_id: rid, precio });
    }
  }
  return unidades;
}

function descuentoPromoNxm(unidades, llevar, pagar) {
  if (!unidades.length || llevar <= pagar) return 0;
  const grupos = Math.floor(unidades.length / llevar);
  const unidadesGratis = grupos * (llevar - pagar);
  if (unidadesGratis <= 0) return 0;
  const ordenadas = [...unidades].sort((a, b) => a.precio - b.precio);
  let descuento = 0;
  for (let i = 0; i < unidadesGratis; i++) {
    descuento += ordenadas[i].precio;
  }
  return Math.round(descuento);
}

function descuentoPorcentaje(montoBase, porcentaje) {
  const pct = Number(porcentaje);
  const base = Number(montoBase);
  if (!Number.isFinite(pct) || pct <= 0 || pct > 100 || base <= 0) return 0;
  return Math.round((base * pct) / 100);
}

function calcularDescuentoPromo(promo, cartItems, subtotalLista) {
  const tipo = promo.tipo || TIPOS_PROMO.NXM;

  if (tipo === TIPOS_PROMO.PORCENTAJE_PRODUCTOS) {
    const recetaIdsSet = new Set(promo.receta_ids || []);
    if (recetaIdsSet.size === 0) return 0;
    const base = subtotalProductosElegibles(cartItems, recetaIdsSet);
    return descuentoPorcentaje(base, promo.porcentaje);
  }

  if (tipo === TIPOS_PROMO.PORCENTAJE_MONTO_MINIMO) {
    const minimo = Number(promo.monto_minimo) || 0;
    if (minimo <= 0 || subtotalLista < minimo) return 0;
    return descuentoPorcentaje(subtotalLista, promo.porcentaje);
  }

  const llevar = Number(promo.llevar) || 0;
  const pagar = Number(promo.pagar) || 0;
  if (llevar <= pagar || pagar < 1) return 0;
  const recetaIdsSet = new Set(promo.receta_ids || []);
  if (recetaIdsSet.size === 0) return 0;
  const unidades = expandirUnidadesElegibles(cartItems, recetaIdsSet);
  return descuentoPromoNxm(unidades, llevar, pagar);
}

/**
 * Calcula promos activas sobre el carrito.
 */
export function calcularPromosEnCarrito(cartItems, promociones) {
  const subtotalLista = subtotalCarrito(cartItems);
  const activas = (promociones || []).filter((p) => p.activa !== false);
  const aplicadas = [];
  let descuentoTotal = 0;

  for (const promo of activas) {
    const descuento = calcularDescuentoPromo(promo, cartItems, subtotalLista);
    if (descuento > 0) {
      aplicadas.push({
        promocion_id: promo.id,
        nombre: promo.nombre,
        descuento,
      });
      descuentoTotal += descuento;
    }
  }

  descuentoTotal = Math.min(descuentoTotal, subtotalLista);

  const promocionId = aplicadas.length === 1 ? aplicadas[0].promocion_id : null;

  return {
    subtotalLista,
    descuentoTotal,
    totalFinal: Math.max(0, subtotalLista - descuentoTotal),
    aplicadas,
    promocionId,
  };
}

/** Reparte descuento de promo entre filas sin dejar total_final negativo. */
export function aplicarDescuentoPromoARows(rows, descuentoTotal, promocionId) {
  if (!rows?.length) return rows;
  if (!descuentoTotal || descuentoTotal <= 0) {
    return rows.map((r) => ({
      ...r,
      descuento: 0,
      total_final: r.subtotal,
      promocion_id: null,
    }));
  }
  let restante = descuentoTotal;
  return rows.map((r) => {
    const d = Math.min(r.subtotal, restante);
    restante -= d;
    return {
      ...r,
      descuento: d,
      total_final: r.subtotal - d,
      promocion_id: promocionId || null,
    };
  });
}

/** Recetas en otra promo activa que usa productos (nxm o % productos). */
export function recetasEnOtrasPromosActivas(promociones, excludePromoId = null) {
  const set = new Set();
  for (const p of promociones || []) {
    if (p.activa === false) continue;
    if (excludePromoId && p.id === excludePromoId) continue;
    const tipo = p.tipo || TIPOS_PROMO.NXM;
    if (tipo === TIPOS_PROMO.PORCENTAJE_MONTO_MINIMO) continue;
    for (const rid of p.receta_ids || []) {
      set.add(rid);
    }
  }
  return set;
}

export function etiquetaPromoNxm(promo) {
  const llevar = promo?.llevar ?? 5;
  const pagar = promo?.pagar ?? 4;
  return `Llevá ${llevar} pagá ${pagar}`;
}

export function etiquetaPromo(promo) {
  const tipo = promo?.tipo || TIPOS_PROMO.NXM;
  if (tipo === TIPOS_PROMO.PORCENTAJE_PRODUCTOS) {
    const pct = promo.porcentaje ?? 0;
    const n = (promo.receta_ids || []).length;
    return `${pct}% en ${n} producto${n === 1 ? "" : "s"}`;
  }
  if (tipo === TIPOS_PROMO.PORCENTAJE_MONTO_MINIMO) {
    const pct = promo.porcentaje ?? 0;
    const min = Number(promo.monto_minimo) || 0;
    const minFmt = min.toLocaleString("es-AR");
    return `${pct}% comprando $${minFmt} o más`;
  }
  return etiquetaPromoNxm(promo);
}

export function promoUsaProductos(tipo) {
  return (
    tipo === TIPOS_PROMO.NXM ||
    tipo === TIPOS_PROMO.PORCENTAJE_PRODUCTOS ||
    !tipo
  );
}
