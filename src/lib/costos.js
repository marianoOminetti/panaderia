/**
 * Cálculo de costos: costoDesdeIngredientes (recetas, precursoras, insumos), costo unitario por receta.
 * Usado por Recetas (RecetaModal), lib de métricas.
 */
import { parseDecimal } from "./format";
import { convertirAUnidadInsumo, aGramos } from "./units";

/** Calcula el costo total desde ingredientes del formulario (antes de guardar). Incluye recetas precursoras. */
export function costoDesdeIngredientes(ingredientes, insumos, recetas = []) {
  let total = 0;
  for (const ing of ingredientes || []) {
    const costoFijoNum = parseDecimal(ing.costo_fijo);
    if (costoFijoNum != null && costoFijoNum > 0) {
      total += costoFijoNum;
      continue;
    }
    if (ing.receta_id_precursora) {
      const prec = recetas.find((r) => r.id === ing.receta_id_precursora);
      const costoUnitPrec = typeof prec?.costo_unitario === "number" && prec.costo_unitario >= 0 ? prec.costo_unitario : 0;
      const cant = parseDecimal(ing.cantidad) ?? 0;
      const u = (ing.unidad || "u").toLowerCase();
      const cantUnidades = u === "u" ? cant : (aGramos(cant, ing.unidad) / (parseFloat(prec?.gramos_por_unidad) || 1));
      total += cantUnidades * costoUnitPrec;
      continue;
    }
    if (!ing.insumo_id) continue;
    const insumo = insumos.find((x) => x.id === ing.insumo_id);
    if (!insumo || !insumo.cantidad_presentacion) continue;
    const cant = parseDecimal(ing.cantidad) ?? 0;
    if (cant <= 0) continue;
    const cantConvertida = convertirAUnidadInsumo(cant, ing.unidad || "g", insumo.unidad);
    const precioUnitario = insumo.precio / insumo.cantidad_presentacion;
    total += precioUnitario * cantConvertida;
  }
  return total;
}

/** Convierte cantidad de una receta precursora a "unidades" (para costo por unidad). */
function cantidadPrecursoraAUnidades(cantidad, unidad, gramosPorUnidad) {
  const u = (unidad || "u").toLowerCase();
  if (u === "u") return cantidad;
  const gramos = aGramos(cantidad, unidad);
  const gPu = typeof gramosPorUnidad === "number" ? gramosPorUnidad : parseFloat(gramosPorUnidad);
  if (gPu > 0) return gramos / gPu;
  return cantidad;
}

/** Calcula el costo total de una receta según ingredientes (insumos, costo fijo o receta precursora).
 * Si hay recetas precursoras, se usa recursión; en ciclos se usa costo_unitario guardado. */
export function costoReceta(recetaId, recetaIngredientes, insumos, recetas = [], visited = new Set()) {
  const ings = recetaIngredientes.filter((i) => i.receta_id === recetaId);
  let total = 0;
  for (const ing of ings) {
    if (ing.costo_fijo != null && ing.costo_fijo > 0) {
      total += ing.costo_fijo;
      continue;
    }
    if (ing.receta_id_precursora) {
      const precId = ing.receta_id_precursora;
      const prec = recetas.find((r) => r.id === precId);
      const rindePrec = prec ? parseFloat(prec.rinde) || 1 : 1;
      const cantidadRaw = parseFloat(ing.cantidad) || 0;
      const cantidadUnidades = cantidadPrecursoraAUnidades(cantidadRaw, ing.unidad || "u", prec?.gramos_por_unidad);
      if (visited.has(precId)) {
        const costoUnitPrec = typeof prec?.costo_unitario === "number" && prec.costo_unitario >= 0 ? prec.costo_unitario : 0;
        total += cantidadUnidades * costoUnitPrec;
      } else {
        visited.add(precId);
        const costoLotePrec = costoReceta(precId, recetaIngredientes, insumos, recetas, visited);
        visited.delete(precId);
        const costoUnitPrec = rindePrec > 0 ? costoLotePrec / rindePrec : 0;
        total += cantidadUnidades * costoUnitPrec;
      }
      continue;
    }
    if (!ing.insumo_id) continue;
    const insumo = insumos.find((x) => x.id === ing.insumo_id);
    if (!insumo || !insumo.cantidad_presentacion) continue;
    const cantConvertida = convertirAUnidadInsumo(
      parseFloat(ing.cantidad) || 0,
      ing.unidad,
      insumo.unidad
    );
    const precioUnitario = insumo.precio / insumo.cantidad_presentacion;
    total += precioUnitario * cantConvertida;
  }
  return total;
}

/** Mapa recetaId → costo unitario (mismo criterio que Analytics).
 * Usa costo_unitario de la receta si está definido y ≥ 0; si no, costoReceta(…) / rinde. */
export function costoUnitarioPorRecetaMap(recetas = [], recetaIngredientes = [], insumos = []) {
  const map = {};
  for (const r of recetas) {
    const rindeNum = parseFloat(r.rinde) || 1;
    const costoLoteCalc = costoReceta(r.id, recetaIngredientes, insumos, recetas);
    const costoUnitarioCalc = rindeNum > 0 ? costoLoteCalc / rindeNum : null;
    const costoUnitario =
      typeof r.costo_unitario === "number" && r.costo_unitario >= 0
        ? r.costo_unitario
        : costoUnitarioCalc;
    if (costoUnitario != null && !Number.isNaN(costoUnitario)) {
      map[r.id] = costoUnitario;
    }
  }
  return map;
}
