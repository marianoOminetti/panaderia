import { convertirAUnidadInsumo, aGramos } from "./units";

/** Convierte cantidad de una receta precursora a "unidades" (para costo por unidad). */
function cantidadPrecursoraAUnidades(cantidad, unidad, gramosPorUnidad) {
  const u = (unidad || "u").toLowerCase();
  if (u === "u") return cantidad;
  const gramos = aGramos(cantidad, unidad);
  const gPu = parseFloat(gramosPorUnidad);
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

