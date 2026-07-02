import { toCantidadNumber } from "./format";

export const TIPOS_PROMO = {
  NXM: "nxm",
  PORCENTAJE_PRODUCTOS: "porcentaje_productos",
  PORCENTAJE_MONTO_MINIMO: "porcentaje_monto_minimo",
  DESCUENTO_FIJO_UNIDAD: "descuento_fijo_unidad",
  COMBO_PRECIO_FIJO: "combo_precio_fijo",
};

export const ALCANCE_PROMO = {
  TODOS: "todos",
  CLIENTES: "clientes",
};

/** Una promo es exclusiva cuando aplica solo a los clientes de su whitelist. */
export function promoEsExclusivaClientes(promo) {
  return promo?.alcance === ALCANCE_PROMO.CLIENTES;
}

/**
 * ¿La promo aplica para este cliente?
 * - Promos globales ('todos' / sin alcance): siempre.
 * - Promos exclusivas: solo si hay cliente y está en la whitelist.
 */
export function promoAplicaACliente(promo, clienteId) {
  if (!promoEsExclusivaClientes(promo)) return true;
  if (!clienteId) return false;
  return (promo.cliente_ids || []).includes(clienteId);
}

/**
 * Normaliza filas de Supabase con join promocion_recetas.
 */
export function isPendingPromoId(id) {
  return id != null && String(id).startsWith("pending-promo-");
}

export function uniqueRecetaIds(ids) {
  return [...new Set((ids || []).filter(Boolean))];
}

/** Suma precio_venta × cantidad para armar el precio lista default de un combo. */
export function calcularPrecioListaCombo(recetas, recetaIds, comboCantidades) {
  let total = 0;
  for (const recetaId of recetaIds || []) {
    const receta = (recetas || []).find((r) => r.id === recetaId);
    if (!receta) continue;
    const raw = String(comboCantidades?.[recetaId] ?? "1").trim().replace(",", ".");
    const cant = parseFloat(raw);
    const qty = Number.isFinite(cant) && cant >= 0.1 ? cant : 1;
    total += (Number(receta.precio_venta) || 0) * qty;
  }
  return Math.round(total);
}

export function normalizarPromociones(rows) {
  return (rows || []).map((p) => {
    const links = p.promocion_recetas || [];
    const comboFromLinks = links.map((l) => ({
      receta_id: l.receta_id,
      cantidad: Number(l.cantidad) > 0 ? Number(l.cantidad) : 1,
    }));
    const combo_items =
      comboFromLinks.length > 0 ? comboFromLinks : p.combo_items || [];
    const receta_ids =
      combo_items.length > 0
        ? uniqueRecetaIds(combo_items.map((l) => l.receta_id))
        : uniqueRecetaIds(p.receta_ids || []);
    const clienteLinks = p.promocion_clientes || [];
    const cliente_ids = uniqueRecetaIds(
      clienteLinks.length > 0
        ? clienteLinks.map((l) => l.cliente_id)
        : p.cliente_ids || [],
    );
    const { promocion_recetas: _pr, promocion_clientes: _pc, ...rest } = p;
    return {
      ...rest,
      receta_ids,
      combo_items,
      cliente_ids,
      alcance: p.alcance === ALCANCE_PROMO.CLIENTES ? ALCANCE_PROMO.CLIENTES : ALCANCE_PROMO.TODOS,
    };
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

function precioUnitarioEnCarrito(cartItems, recetaId) {
  for (const item of cartItems || []) {
    if (item.receta?.id === recetaId) {
      return Number(item.precio_unitario) || 0;
    }
  }
  return 0;
}

function cantidadDisponibleEnCarrito(cartItems, recetaId) {
  let total = 0;
  for (const item of cartItems || []) {
    if (item.receta?.id !== recetaId) continue;
    total += toCantidadNumber(item.cantidad) || 0;
  }
  return total;
}

/** Combo: N productos con cantidades fijas a un precio total (puede repetirse si hay stock). */
function descuentoComboPrecioFijo(cartItems, comboItems, precioCombo) {
  const precio = Number(precioCombo);
  if (!Number.isFinite(precio) || precio < 0 || !comboItems?.length) return 0;

  let numCombos = Infinity;
  for (const { receta_id, cantidad } of comboItems) {
    const req = Number(cantidad) || 0;
    if (req <= 0) return 0;
    const disponible = cantidadDisponibleEnCarrito(cartItems, receta_id);
    numCombos = Math.min(numCombos, Math.floor(disponible / req));
  }

  if (!Number.isFinite(numCombos) || numCombos <= 0) return 0;

  let subtotalListaCombo = 0;
  for (const { receta_id, cantidad } of comboItems) {
    const req = Number(cantidad) || 0;
    const precioUnit = precioUnitarioEnCarrito(cartItems, receta_id);
    subtotalListaCombo += precioUnit * req * numCombos;
  }

  const descuento = subtotalListaCombo - precio * numCombos;
  return Math.max(0, Math.round(descuento));
}

/** $ fijos por cada unidad entera de productos elegidos (no supera el subtotal de la línea). */
function descuentoFijoPorUnidad(cartItems, recetaIdsSet, montoPorUnidad) {
  const monto = Number(montoPorUnidad);
  if (!Number.isFinite(monto) || monto <= 0 || recetaIdsSet.size === 0) return 0;

  let descuento = 0;
  for (const item of cartItems || []) {
    const rid = item.receta?.id;
    if (!rid || !recetaIdsSet.has(rid)) continue;
    const cant = Math.floor(toCantidadNumber(item.cantidad) || 0);
    if (cant <= 0) continue;
    const precio = Number(item.precio_unitario) || 0;
    const lineSubtotal = precio * cant;
    descuento += Math.min(lineSubtotal, monto * cant);
  }
  return Math.round(descuento);
}

function calcularDescuentoPromo(promo, cartItems, subtotalLista) {
  const tipo = promo.tipo || TIPOS_PROMO.NXM;

  if (tipo === TIPOS_PROMO.DESCUENTO_FIJO_UNIDAD) {
    const recetaIdsSet = new Set(promo.receta_ids || []);
    return descuentoFijoPorUnidad(cartItems, recetaIdsSet, promo.descuento_fijo);
  }

  if (tipo === TIPOS_PROMO.COMBO_PRECIO_FIJO) {
    const comboItems = promo.combo_items?.length
      ? promo.combo_items
      : (promo.receta_ids || []).map((receta_id) => ({ receta_id, cantidad: 1 }));
    return descuentoComboPrecioFijo(cartItems, comboItems, promo.precio_combo);
  }

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
 * Lista promos activas con descuento potencial (para pantalla de cobro).
 */
export function listarPromosParaCobro(
  cartItems,
  promociones,
  excludePromoIds = [],
  clienteId = null,
) {
  const subtotalLista = subtotalCarrito(cartItems);
  const excludeSet = new Set(excludePromoIds || []);
  const activas = (promociones || []).filter(
    (p) =>
      p.activa !== false &&
      !isPendingPromoId(p.id) &&
      promoAplicaACliente(p, clienteId),
  );

  return activas
    .map((promo) => {
      const descuento = calcularDescuentoPromo(promo, cartItems, subtotalLista);
      return {
        promocion_id: promo.id,
        nombre: promo.nombre,
        etiqueta: etiquetaPromo(promo),
        descuento,
        excluida: excludeSet.has(promo.id),
        aplica: descuento > 0 && !excludeSet.has(promo.id),
      };
    })
    .filter((p) => p.descuento > 0);
}

/**
 * Calcula promos activas sobre el carrito.
 * @param {{ excludePromoIds?: string[], clienteId?: string|null }} [opciones]
 */
export function calcularPromosEnCarrito(cartItems, promociones, opciones = {}) {
  const subtotalLista = subtotalCarrito(cartItems);
  const excludeSet = new Set(opciones.excludePromoIds || []);
  const clienteId = opciones.clienteId ?? null;
  const activas = (promociones || []).filter(
    (p) =>
      p.activa !== false &&
      !excludeSet.has(p.id) &&
      !isPendingPromoId(p.id) &&
      promoAplicaACliente(p, clienteId),
  );
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
  if (tipo === TIPOS_PROMO.DESCUENTO_FIJO_UNIDAD) {
    const monto = Number(promo.descuento_fijo) || 0;
    const montoFmt = monto.toLocaleString("es-AR");
    const n = (promo.receta_ids || []).length;
    return `$${montoFmt} off por unidad en ${n} producto${n === 1 ? "" : "s"}`;
  }
  if (tipo === TIPOS_PROMO.COMBO_PRECIO_FIJO) {
    const precio = Number(promo.precio_combo) || 0;
    const precioFmt = precio.toLocaleString("es-AR");
    const n = (promo.combo_items || promo.receta_ids || []).length;
    return `Combo $${precioFmt} (${n} producto${n === 1 ? "" : "s"})`;
  }
  return etiquetaPromoNxm(promo);
}

export function promoUsaProductos(tipo) {
  return (
    tipo === TIPOS_PROMO.NXM ||
    tipo === TIPOS_PROMO.PORCENTAJE_PRODUCTOS ||
    tipo === TIPOS_PROMO.DESCUENTO_FIJO_UNIDAD ||
    tipo === TIPOS_PROMO.COMBO_PRECIO_FIJO ||
    !tipo
  );
}

export function promoUsaCantidadesPorProducto(tipo) {
  return tipo === TIPOS_PROMO.COMBO_PRECIO_FIJO;
}

export function comboCantidadesDesdeItems(comboItems) {
  const map = {};
  for (const { receta_id, cantidad } of comboItems || []) {
    if (receta_id) map[receta_id] = cantidad;
  }
  return map;
}

export function filtrarCombosActivos(promociones) {
  return (promociones || [])
    .filter((p) => {
      if (p.tipo !== TIPOS_PROMO.COMBO_PRECIO_FIJO) return false;
      if (p.activa === false) return false;
      if (isPendingPromoId(p.id)) return false;
      const items = p.combo_items?.length
        ? p.combo_items
        : (p.receta_ids || []).map((receta_id) => ({ receta_id, cantidad: 1 }));
      return items.length > 0;
    })
    .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));
}

export function filtrarCombosVendibles(promociones, recetas) {
  return filtrarCombosActivos(promociones).filter((promo) => {
    const items = promo.combo_items?.length
      ? promo.combo_items
      : (promo.receta_ids || []).map((receta_id) => ({ receta_id, cantidad: 1 }));
    return comboEsVendible(recetas, items);
  });
}

export function comboTieneStockSuficiente(stock, comboItems, cartItems = []) {
  const items = comboItems || [];
  if (!items.length) return false;

  const enCarrito = new Map();
  for (const item of cartItems || []) {
    const rid = item.receta?.id;
    if (!rid) continue;
    enCarrito.set(rid, (enCarrito.get(rid) || 0) + (Number(item.cantidad) || 0));
  }

  for (const { receta_id, cantidad } of items) {
    const req = Number(cantidad) || 0;
    if (req <= 0) return false;
    const disponible = Math.max(0, (Number(stock?.[receta_id]) || 0) - (enCarrito.get(receta_id) || 0));
    if (disponible < req) return false;
  }
  return true;
}

export function comboItemsResolubles(recetas, comboItems) {
  const items = comboItems || [];
  if (!items.length) return [];
  return items
    .map(({ receta_id, cantidad }) => {
      const receta = (recetas || []).find((r) => r.id === receta_id);
      if (!receta) return null;
      return { receta, cantidad: Number(cantidad) || 1 };
    })
    .filter(Boolean);
}

export function comboEsVendible(recetas, comboItems) {
  const items = comboItems || [];
  return items.length > 0 && comboItemsResolubles(recetas, items).length === items.length;
}

export function calcularPrecioListaComboDesdeItems(recetas, comboItems) {
  const ids = (comboItems || []).map((i) => i.receta_id).filter(Boolean);
  return calcularPrecioListaCombo(recetas, ids, comboCantidadesDesdeItems(comboItems));
}
