import { parseDecimal } from "./format";

/** Unidad sugerida al elegir una receta precursora como ingrediente. */
export function unidadDefaultPrecursora(receta) {
  const gpu = parseDecimal(receta?.gramos_por_unidad);
  if (gpu != null && gpu > 0) return "g";
  return "u";
}

export function cantidadDefaultPrecursora(receta, unidad = null) {
  const u = unidad || unidadDefaultPrecursora(receta);
  if (u === "u") return "1";
  const gpu = parseDecimal(receta?.gramos_por_unidad);
  return gpu != null && gpu > 0 ? String(gpu) : "1";
}

/** Defaults de cantidad y unidad al seleccionar una precursora en el formulario. */
export function defaultsAlElegirPrecursora(receta) {
  const unidad = unidadDefaultPrecursora(receta);
  return {
    unidad,
    cantidad: cantidadDefaultPrecursora(receta, unidad),
  };
}
