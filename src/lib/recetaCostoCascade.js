/**
 * Propaga recálculo de costos a recetas que usan una precursora (directa o indirecta).
 */
import { parseDecimal } from "./format";
import { costoReceta } from "./costos";

function buildPadresPorPrecursora(recetaIngredientes = []) {
  const map = new Map();
  for (const ri of recetaIngredientes) {
    if (!ri.receta_id_precursora) continue;
    const key = String(ri.receta_id_precursora);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(String(ri.receta_id));
  }
  return map;
}

/** IDs de recetas afectadas al cambiar costo de `recetaId` (BFS hacia arriba). */
export function recetasDependientesDe(recetaId, recetaIngredientes = []) {
  const padres = buildPadresPorPrecursora(recetaIngredientes);
  const ids = new Set();
  const queue = [String(recetaId)];
  while (queue.length) {
    const current = queue.shift();
    for (const padre of padres.get(current) || []) {
      if (!ids.has(padre)) {
        ids.add(padre);
        queue.push(padre);
      }
    }
  }
  return [...ids];
}

/** Calcula costo_lote y costo_unitario actualizados para una receta. */
export function calcularCostosReceta(receta, recetaIngredientes, insumos, recetas) {
  const rindeNum = parseDecimal(receta?.rinde) ?? 1;
  const costoLote = costoReceta(receta.id, recetaIngredientes, insumos, recetas);
  const costoUnitario = rindeNum > 0 ? costoLote / rindeNum : 0;
  return { costo_lote: costoLote, costo_unitario: costoUnitario };
}

/**
 * Lista de updates { id, costo_lote, costo_unitario } para la receta y sus dependientes.
 */
export function costosParaRecetaYCadena(recetaId, recetas, recetaIngredientes, insumos) {
  const recetasPorId = Object.fromEntries((recetas || []).map((r) => [String(r.id), r]));
  const ids = [String(recetaId), ...recetasDependientesDe(recetaId, recetaIngredientes)];
  const unique = [...new Set(ids)];
  return unique
    .map((id) => {
      const receta = recetasPorId[id];
      if (!receta) return null;
      const { costo_lote, costo_unitario } = calcularCostosReceta(
        receta,
        recetaIngredientes,
        insumos,
        recetas,
      );
      return { id: receta.id, costo_lote, costo_unitario };
    })
    .filter(Boolean);
}

/**
 * Detecta ingredientes precursora cuyo costo no se puede calcular (falta gramos_por_unidad, etc.).
 */
export function advertenciasCosteoIngredientes(ingredientes, insumos, recetas, recetaIngredientes) {
  const avisos = [];
  for (const ing of ingredientes || []) {
    if (!ing.receta_id_precursora) continue;
    const prec = (recetas || []).find((r) => String(r.id) === String(ing.receta_id_precursora));
    if (!prec) {
      avisos.push("Hay una masa vinculada que no existe en el catálogo.");
      continue;
    }
    const u = (ing.unidad || "g").toLowerCase();
    const gPu = parseDecimal(prec.gramos_por_unidad);
    if (u !== "u" && (gPu == null || gPu <= 0)) {
      avisos.push(
        `${prec.nombre}: falta «gramos por unidad» para costear ${ing.cantidad || "?"} ${ing.unidad || "g"}.`,
      );
    }
    const costoLote = costoReceta(prec.id, recetaIngredientes || [], insumos, recetas);
    if (costoLote <= 0) {
      avisos.push(`${prec.nombre}: costo de la masa en $0 — revisá sus ingredientes.`);
    }
  }
  return [...new Set(avisos)];
}
