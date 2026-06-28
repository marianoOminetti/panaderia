/**
 * Conversión de unidades (g, kg, ml, l, u) para insumos y recetas.
 * Usado por costos.js, stockPlan.js, Recetas (ingredientes).
 */

/** 1 huevo ≈ 50 g. Recetas en g y en u deben dar el mismo costo/stock. */
export const GRAMOS_POR_HUEVO = 50;

export function esInsumoHuevos(insumoOrNombre) {
  if (!insumoOrNombre) return false;
  const nombre =
    typeof insumoOrNombre === "string" ? insumoOrNombre : insumoOrNombre.nombre;
  return /huevo/i.test(nombre || "");
}

export function aGramos(cantidad, unidad) {
  const u = (unidad || "g").toLowerCase();
  if (u === "g") return cantidad;
  if (u === "kg") return cantidad * 1000;
  if (u === "ml" || u === "l") return cantidad * (u === "l" ? 1000 : 1);
  return cantidad;
}

/**
 * Convierte cantidad de la unidad de la receta a la unidad del insumo.
 * @param {object} [insumo] — si es Huevos, 50 g = 1 u
 */
export function convertirAUnidadInsumo(cantidad, desdeUnidad, haciaUnidad, insumo) {
  const desde = (desdeUnidad || "g").toLowerCase();
  const hacia = (haciaUnidad || "g").toLowerCase();

  if (esInsumoHuevos(insumo) && hacia === "u") {
    if (desde === "u") return cantidad;
    if (desde === "g") return cantidad / GRAMOS_POR_HUEVO;
    if (desde === "kg") return (cantidad * 1000) / GRAMOS_POR_HUEVO;
    return cantidad;
  }

  if (esInsumoHuevos(insumo) && desde === "u" && (hacia === "g" || hacia === "kg")) {
    const gramos = cantidad * GRAMOS_POR_HUEVO;
    return hacia === "kg" ? gramos / 1000 : gramos;
  }

  if (hacia === "g" || hacia === "kg") {
    const gramos = desde === "kg" ? cantidad * 1000 : cantidad;
    return hacia === "kg" ? gramos / 1000 : gramos;
  }
  if (hacia === "ml" || hacia === "l") {
    const ml = desde === "l" ? cantidad * 1000 : cantidad;
    return hacia === "l" ? ml / 1000 : ml;
  }
  return cantidad; // u
}

