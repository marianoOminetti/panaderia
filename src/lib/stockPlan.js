import { aGramos, convertirAUnidadInsumo } from "./units";

/** Calcula cuántos insumos se necesitan para una lista de recetas y cantidades.
 * Devuelve [{ insumo_id, insumo, cantidad }] donde cantidad está en la unidad del insumo. */
export function calcularRequerimientoInsumosParaItems(
  items,
  recetaIngredientes,
  insumos,
  insumoComposicion,
) {
  if (!items?.length || !recetaIngredientes?.length || !insumos?.length) {
    return [];
  }
  const composicionPorInsumo = {};
  for (const c of insumoComposicion || []) {
    if (!composicionPorInsumo[c.insumo_id]) {
      composicionPorInsumo[c.insumo_id] = [];
    }
    composicionPorInsumo[c.insumo_id].push(c);
  }
  const requeridos = {};
  for (const { receta, cantidad } of items) {
    if (!receta?.id || !receta.rinde || !cantidad || cantidad <= 0) continue;
    const ings = (recetaIngredientes || []).filter(
      (i) => i.receta_id === receta.id && i.insumo_id,
    );
    for (const ing of ings) {
      const insumo = insumos.find((x) => x.id === ing.insumo_id);
      if (!insumo) continue;
      const cantPorUnidad =
        (parseFloat(ing.cantidad) || 0) / (receta.rinde || 1);
      const cantTotalIng = cantPorUnidad * cantidad;
      const cantGramos = aGramos(cantTotalIng, ing.unidad || "g");
      const componentes = composicionPorInsumo[ing.insumo_id];
      if (componentes && componentes.length > 0) {
        for (const comp of componentes) {
          const factor = parseFloat(comp.factor) || 0;
          if (factor <= 0) continue;
          const insumoHijo = insumos.find(
            (x) => x.id === comp.insumo_id_componente,
          );
          if (!insumoHijo) continue;
          const cantHijoGramos = cantGramos * factor;
          const cantHijo = convertirAUnidadInsumo(
            cantHijoGramos,
            "g",
            insumoHijo.unidad || "g",
          );
          if (!requeridos[insumoHijo.id]) {
            requeridos[insumoHijo.id] = {
              insumo_id: insumoHijo.id,
              insumo: insumoHijo,
              cantidad: 0,
            };
          }
          requeridos[insumoHijo.id].cantidad += cantHijo;
        }
      } else {
        const cantEnUnidad = convertirAUnidadInsumo(
          cantTotalIng,
          ing.unidad || "g",
          insumo.unidad || "g",
        );
        if (!requeridos[insumo.id]) {
          requeridos[insumo.id] = {
            insumo_id: insumo.id,
            insumo,
            cantidad: 0,
          };
        }
        requeridos[insumo.id].cantidad += cantEnUnidad;
      }
    }
  }
  return Object.values(requeridos);
}

/** Devuelve insumos con stock 0 que se consumirían al cargar stock de las recetas dadas.
 * Incluye: ingredientes directos y componentes (si el insumo tiene composición). */
export function getInsumosEnCeroParaRecetas(
  items,
  recetaIngredientes,
  insumos,
  insumoComposicion,
  insumoStock,
) {
  if (!items?.length || !insumos?.length) return [];
  const composicionPorInsumo = {};
  for (const c of insumoComposicion || []) {
    if (!composicionPorInsumo[c.insumo_id]) {
      composicionPorInsumo[c.insumo_id] = [];
    }
    composicionPorInsumo[c.insumo_id].push(c);
  }
  const idsEnCero = new Set();
  const insumosPorId = {};
  for (const { receta } of items) {
    if (!receta?.rinde) continue;
    const ings = (recetaIngredientes || []).filter(
      (i) => i.receta_id === receta.id && i.insumo_id,
    );
    for (const ing of ings) {
      const insumo = insumos.find((x) => x.id === ing.insumo_id);
      if (!insumo) continue;
      const componentes = composicionPorInsumo[ing.insumo_id];
      if (componentes && componentes.length > 0) {
        for (const comp of componentes) {
          const insumoHijo = insumos.find(
            (x) => x.id === comp.insumo_id_componente,
          );
          if (
            insumoHijo &&
            ((insumoStock || {})[insumoHijo.id] ?? 0) <= 0
          ) {
            idsEnCero.add(insumoHijo.id);
            insumosPorId[insumoHijo.id] = insumoHijo;
          }
        }
      } else if (((insumoStock || {})[ing.insumo_id] ?? 0) <= 0) {
        idsEnCero.add(ing.insumo_id);
        insumosPorId[ing.insumo_id] = insumo;
      }
    }
  }
  return [...idsEnCero]
    .map((id) => ({ insumo_id: id, insumo: insumosPorId[id] }))
    .filter((x) => x.insumo);
}

