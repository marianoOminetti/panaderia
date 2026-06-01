import { toCantidadNumber } from "./format";

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

/**
 * Calcula promos activas sobre el carrito.
 * @returns {{ subtotalLista, descuentoTotal, totalFinal, aplicadas, promocionId }}
 */
export function calcularPromosEnCarrito(cartItems, promociones) {
  const subtotalLista = (cartItems || []).reduce((s, it) => {
    const cant = toCantidadNumber(it.cantidad) || 0;
    return s + (Number(it.precio_unitario) || 0) * cant;
  }, 0);

  const activas = (promociones || []).filter((p) => p.activa !== false);
  const aplicadas = [];
  let descuentoTotal = 0;

  for (const promo of activas) {
    if (promo.tipo !== "nxm") continue;
    const llevar = Number(promo.llevar) || 0;
    const pagar = Number(promo.pagar) || 0;
    if (llevar <= pagar || pagar < 1) continue;
    const recetaIdsSet = new Set(promo.receta_ids || []);
    if (recetaIdsSet.size === 0) continue;
    const unidades = expandirUnidadesElegibles(cartItems, recetaIdsSet);
    const descuento = descuentoPromoNxm(unidades, llevar, pagar);
    if (descuento > 0) {
      aplicadas.push({
        promocion_id: promo.id,
        nombre: promo.nombre,
        descuento,
      });
      descuentoTotal += descuento;
    }
  }

  const promocionId =
    aplicadas.length >= 1 ? aplicadas[0].promocion_id : null;

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

/** Recetas ya usadas en otra promo activa (excluye promoId al editar). */
export function recetasEnOtrasPromosActivas(promociones, excludePromoId = null) {
  const set = new Set();
  for (const p of promociones || []) {
    if (p.activa === false) continue;
    if (excludePromoId && p.id === excludePromoId) continue;
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
