/**
 * Plan de stock: explosión de recetas a ítems, cálculo de insumos necesarios para producción.
 * Usado por Stock (producción), useStockMutations (consumir insumos al cargar stock).
 */
import { aGramos, convertirAUnidadInsumo } from "./units";

/** Explota una receta (y sus precursoras) a ítems (receta, cantidad) para sumar insumos.
 * Evita ciclos con visited. */
function explotarRecetaAItems(recetaId, cantidadReceta, recetaIngredientes, recetas, visited, items) {
  if (!recetaId || !cantidadReceta || cantidadReceta <= 0 || visited.has(recetaId)) return;
  const receta = recetas.find((r) => r.id === recetaId);
  if (!receta || !receta.rinde) return;
  visited.add(recetaId);
  const ings = (recetaIngredientes || []).filter((i) => i.receta_id === recetaId);
  for (const ing of ings) {
    if (ing.receta_id_precursora) {
      const prec = recetas.find((r) => r.id === ing.receta_id_precursora);
      const u = (ing.unidad || "u").toLowerCase();
      const cantidadRaw = parseFloat(ing.cantidad) || 0;
      const cantidadUnidades = u === "u" ? cantidadRaw : (aGramos(cantidadRaw, ing.unidad) / (parseFloat(prec?.gramos_por_unidad) || 1));
      const cantPrec = cantidadUnidades / (receta.rinde || 1) * cantidadReceta;
      explotarRecetaAItems(ing.receta_id_precursora, cantPrec, recetaIngredientes, recetas, visited, items);
    }
  }
  visited.delete(recetaId);
  const ya = items.find((x) => x.receta?.id === recetaId);
  if (ya) ya.cantidad += cantidadReceta;
  else items.push({ receta, cantidad: cantidadReceta });
}

/** Devuelve ítems (receta, cantidad) explotando precursoras. Para uso en consumo de insumos al cargar stock. */
export function getItemsExplotados(recetaId, cantidad, recetaIngredientes, recetas) {
  if (!recetas?.length) return [];
  const items = [];
  explotarRecetaAItems(recetaId, cantidad, recetaIngredientes || [], recetas, new Set(), items);
  return items;
}

/** Calcula cuántos insumos se necesitan para una lista de recetas y cantidades.
 * Incluye ingredientes de recetas precursoras (explotadas recursivamente).
 * Devuelve [{ insumo_id, insumo, cantidad }] donde cantidad está en la unidad del insumo. */
export function calcularRequerimientoInsumosParaItems(
  items,
  recetaIngredientes,
  insumos,
  insumoComposicion,
  recetas = [],
) {
  if (!items?.length || !recetaIngredientes?.length || !insumos?.length) {
    return [];
  }
  const itemsExplotados = [];
  const visited = new Set();
  const recetasList = recetas?.length ? recetas : items.map((x) => x.receta).filter(Boolean);
  for (const { receta, cantidad } of items) {
    if (!receta?.id || !receta.rinde || !cantidad || cantidad <= 0) continue;
    if (recetasList.length) {
      explotarRecetaAItems(receta.id, cantidad, recetaIngredientes, recetasList, visited, itemsExplotados);
    } else {
      itemsExplotados.push({ receta, cantidad });
    }
  }
  const composicionPorInsumo = {};
  for (const c of insumoComposicion || []) {
    if (!composicionPorInsumo[c.insumo_id]) {
      composicionPorInsumo[c.insumo_id] = [];
    }
    composicionPorInsumo[c.insumo_id].push(c);
  }
  const requeridos = {};
  for (const { receta, cantidad } of itemsExplotados) {
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
 * Si se pasa recetas, explota recetas precursoras. Incluye componentes (insumo_composicion). */
export function getInsumosEnCeroParaRecetas(
  items,
  recetaIngredientes,
  insumos,
  insumoComposicion,
  insumoStock,
  recetas = [],
) {
  if (!items?.length || !insumos?.length) return [];
  let itemsParaRevisar = items;
  if (recetas?.length) {
    const exploded = [];
    const visited = new Set();
    for (const { receta, cantidad } of items) {
      if (!receta?.id || !cantidad || cantidad <= 0) continue;
      explotarRecetaAItems(receta.id, cantidad, recetaIngredientes, recetas, visited, exploded);
    }
    itemsParaRevisar = exploded;
  }
  const composicionPorInsumo = {};
  for (const c of insumoComposicion || []) {
    if (!composicionPorInsumo[c.insumo_id]) {
      composicionPorInsumo[c.insumo_id] = [];
    }
    composicionPorInsumo[c.insumo_id].push(c);
  }
  const idsEnCero = new Set();
  const insumosPorId = {};
  for (const { receta } of itemsParaRevisar) {
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

