import { hoyLocalISO } from "./dates";

/** Fecha ISO (YYYY-MM-DD) de hace `dias` días respecto a `baseISO`. */
export function fechaHaceDiasISO(baseISO, dias) {
  const [y, m, d] = String(baseISO).split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - dias);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Unidades vendidas por receta_id en ventana [desdeISO, hastaISO] inclusive.
 * @param {Array} ventas
 * @param {string} desdeISO
 * @param {string} hastaISO
 * @returns {Map<string, number>}
 */
export function unidadesVendidasPorRecetaEnRango(ventas, desdeISO, hastaISO) {
  const map = new Map();
  for (const v of ventas || []) {
    if (v.receta_id == null || !v.fecha) continue;
    const f = String(v.fecha).slice(0, 10);
    if (f < desdeISO || f > hastaISO) continue;
    const id = String(v.receta_id);
    map.set(id, (map.get(id) || 0) + (Number(v.cantidad) || 0));
  }
  return map;
}

/** Últimos 7 días corridos incluyendo hoy. */
export function unidadesVendidasUltimos7Dias(ventas, hoyISO = hoyLocalISO()) {
  const desde = fechaHaceDiasISO(hoyISO, 6);
  return unidadesVendidasPorRecetaEnRango(ventas, desde, hoyISO);
}

function compareNombre(a, b) {
  return (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" });
}

/**
 * Lista para Nueva venta: sin ocultos, orden por unidades (7 días) desc, sin ventas al fondo.
 * @param {Array} recetas
 * @param {Array} ventas
 * @param {string} [hoyISO]
 * @returns {Array}
 */
export function prepararRecetasParaVenta(recetas, ventas, hoyISO = hoyLocalISO()) {
  const list = (recetas || []).filter((r) => r && !r.oculto_en_venta);
  const unidades = unidadesVendidasUltimos7Dias(ventas, hoyISO);

  return [...list].sort((a, b) => {
    const ua = unidades.get(String(a.id)) || 0;
    const ub = unidades.get(String(b.id)) || 0;
    const aSinVentas = ua <= 0;
    const bSinVentas = ub <= 0;
    if (aSinVentas !== bSinVentas) return aSinVentas ? 1 : -1;
    if (ua !== ub) return ub - ua;
    return compareNombre(a, b);
  });
}
