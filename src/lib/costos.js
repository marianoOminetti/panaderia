import { convertirAUnidadInsumo } from "./units";

/** Calcula el costo total de una receta según sus ingredientes e insumos */
export function costoReceta(recetaId, recetaIngredientes, insumos) {
  const ings = recetaIngredientes.filter((i) => i.receta_id === recetaId);
  let total = 0;
  for (const ing of ings) {
    if (ing.costo_fijo != null && ing.costo_fijo > 0) {
      total += ing.costo_fijo;
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

