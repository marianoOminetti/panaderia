/**
 * Conversión de unidades (g, kg, ml, l, u) para insumos y recetas.
 * Usado por costos.js, stockPlan.js, Recetas (ingredientes).
 */
export function aGramos(cantidad, unidad) {
  const u = (unidad || "g").toLowerCase();
  if (u === "g") return cantidad;
  if (u === "kg") return cantidad * 1000;
  if (u === "ml" || u === "l") return cantidad * (u === "l" ? 1000 : 1);
  return cantidad;
}

export function convertirAUnidadInsumo(cantidad, desdeUnidad, haciaUnidad) {
  const desde = (desdeUnidad || "g").toLowerCase();
  const hacia = (haciaUnidad || "g").toLowerCase();
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

