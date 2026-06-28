/**
 * Cálculo de costos: costoDesdeIngredientes (recetas, precursoras, insumos), costo unitario por receta.
 * Usado por Recetas (RecetaModal), lib de métricas.
 */
import { parseDecimal } from "./format";
import { convertirAUnidadInsumo, aGramos } from "./units";

// Algunos IDs vienen como `number` y otros como `string` desde Supabase/formularios.
// Para evitar que `.find()`/`.filter()` no matcheen, normalizamos a string.
function normId(v) {
  return v === null || v === undefined ? null : String(v);
}

/** Calcula el costo total desde ingredientes del formulario (antes de guardar). Incluye recetas precursoras. */
export function costoDesdeIngredientes(
  ingredientes,
  insumos,
  recetas = [],
  recetaIngredientes = [],
) {
  let total = 0;
  for (const ing of ingredientes || []) {
    const costoFijoNum = parseDecimal(ing.costo_fijo);
    if (costoFijoNum != null && costoFijoNum > 0) {
      total += costoFijoNum;
      continue;
    }
    if (ing.receta_id_precursora) {
      const precId = normId(ing.receta_id_precursora);
      const prec = recetas.find((r) => normId(r.id) === precId);
      const rindePrec = prec ? parseDecimal(prec.rinde) ?? 1 : 1;
      const cantRaw = parseDecimal(ing.cantidad) ?? 0;
      const cantUnidades = cantidadPrecursoraAUnidades(
        cantRaw,
        ing.unidad || "u",
        prec?.gramos_por_unidad,
      );
      if (cantUnidades == null) continue;

      const costoPrecLote = costoReceta(
        precId,
        recetaIngredientes,
        insumos,
        recetas,
      );
      const costoUnitPrec = rindePrec > 0 ? costoPrecLote / rindePrec : 0;

      total += cantUnidades * costoUnitPrec;
      continue;
    }
    if (!ing.insumo_id) continue;
    const insumo = insumos.find((x) => normId(x.id) === normId(ing.insumo_id));
    const cantidadPresentacion = parseDecimal(insumo?.cantidad_presentacion);
    if (!Number.isFinite(cantidadPresentacion) || cantidadPresentacion <= 0) continue;
    const cant = parseDecimal(ing.cantidad) ?? 0;
    if (cant <= 0) continue;
    const cantConvertida = convertirAUnidadInsumo(cant, ing.unidad || "g", insumo.unidad);
    const precio = parseDecimal(insumo?.precio) ?? 0;
    const precioUnitario = precio / cantidadPresentacion;
    total += precioUnitario * cantConvertida;
  }
  return total;
}

/** Convierte cantidad de una receta precursora a "unidades" (para costo por unidad). */
function cantidadPrecursoraAUnidades(cantidad, unidad, gramosPorUnidad) {
  const u = (unidad || "u").toLowerCase();
  if (u === "u") return cantidad;
  const gramos = aGramos(cantidad, unidad);
  const gPu =
    typeof gramosPorUnidad === "number"
      ? gramosPorUnidad
      : parseDecimal(gramosPorUnidad);
  // Si falta `gramos_por_unidad` y la unidad NO es `u`, no podemos convertir bien.
  // Evitamos un fallback que dispara costos enormes.
  if (gPu == null || !Number.isFinite(gPu) || gPu <= 0) return null;
  return gramos / gPu;
}

/** Calcula el costo total de una receta según ingredientes (insumos, costo fijo o receta precursora).
 * Si hay recetas precursoras, se usa recursión; en ciclos se usa costo_unitario guardado. */
export function costoReceta(recetaId, recetaIngredientes, insumos, recetas = [], visited = new Set()) {
  const targetId = normId(recetaId);
  const ings = recetaIngredientes.filter((i) => normId(i.receta_id) === targetId);
  let total = 0;
  for (const ing of ings) {
    if (ing.costo_fijo != null && ing.costo_fijo > 0) {
      total += ing.costo_fijo;
      continue;
    }
    if (ing.receta_id_precursora) {
      const precId = normId(ing.receta_id_precursora);
      const prec = recetas.find((r) => normId(r.id) === precId);
      const rindePrec = prec ? (parseDecimal(prec.rinde) ?? 1) : 1;
      const cantidadRaw = parseDecimal(ing.cantidad) ?? 0;
      const cantidadUnidades = cantidadPrecursoraAUnidades(
        cantidadRaw,
        ing.unidad || "u",
        prec?.gramos_por_unidad,
      );
      if (cantidadUnidades == null) continue;
      if (visited.has(precId)) {
        const costoUnitPrec = (() => {
          const parsed = typeof prec?.costo_unitario === "number" ? prec.costo_unitario : parseDecimal(prec?.costo_unitario);
          return typeof parsed === "number" && parsed >= 0 ? parsed : 0;
        })();
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
    const insumo = insumos.find((x) => normId(x.id) === normId(ing.insumo_id));
    const cantidadPresentacion = parseDecimal(insumo?.cantidad_presentacion);
    if (!Number.isFinite(cantidadPresentacion) || cantidadPresentacion <= 0) continue;
    const cantRaw = parseDecimal(ing.cantidad) ?? 0;
    const cantConvertida = convertirAUnidadInsumo(
      cantRaw,
      ing.unidad,
      insumo.unidad
    );
    const precio = parseDecimal(insumo?.precio) ?? 0;
    const precioUnitario = precio / cantidadPresentacion;
    total += precioUnitario * cantConvertida;
  }
  return total;
}

/** Mapa recetaId → costo unitario (mismo criterio que Analytics).
 * Usa costo_unitario de la receta si está definido y ≥ 0; si no, costoReceta(…) / rinde. */
export function costoUnitarioPorRecetaMap(recetas = [], recetaIngredientes = [], insumos = []) {
  const map = {};
  for (const r of recetas) {
    const rindeNum = parseDecimal(r.rinde) ?? 1;
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
