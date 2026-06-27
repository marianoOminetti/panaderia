import { getItemsExplotados } from "./stockPlan";

/**
 * Carga stock de productos y descuenta insumos. Rollback si falla el consumo.
 * Usado por Stock.jsx y useStockQuickEdit.
 */
export async function ejecutarCargaStock({
  items,
  recetas,
  recetaIngredientes,
  actualizarStock,
  actualizarStockBatch,
  consumirInsumosPorStock,
  onRefresh,
  showToast,
}) {
  if (!items?.length) return;

  const total = items.reduce((s, v) => s + v.cantidad, 0);
  const deltas = items.map((it) => ({
    receta_id: it.receta.id,
    delta: it.cantidad || 0,
  }));

  if (actualizarStockBatch) {
    await actualizarStockBatch(deltas);
  } else {
    for (const { receta, cantidad: cant } of items) {
      await actualizarStock(receta.id, cant);
    }
  }

  const consumoErrors = [];
  if (consumirInsumosPorStock) {
    const explodedByReceta = {};
    for (const { receta, cantidad } of items) {
      const exploded =
        recetas?.length && recetaIngredientes?.length
          ? getItemsExplotados(receta.id, cantidad, recetaIngredientes, recetas)
          : [{ receta, cantidad }];
      for (const { receta: r, cantidad: c } of exploded) {
        if (r?.id && c > 0) {
          explodedByReceta[r.id] = (explodedByReceta[r.id] || 0) + c;
        }
      }
    }
    for (const [recetaId, cant] of Object.entries(explodedByReceta)) {
      const receta = recetas?.find((r) => r.id === recetaId);
      try {
        await consumirInsumosPorStock(recetaId, cant);
      } catch {
        consumoErrors.push(receta?.nombre || recetaId);
      }
    }
  }

  if (consumoErrors.length > 0) {
    const undoDeltas = items.map((it) => ({
      receta_id: it.receta.id,
      delta: -(it.cantidad || 0),
    }));
    if (actualizarStockBatch) {
      await actualizarStockBatch(undoDeltas);
    } else {
      for (const { receta, cantidad: cant } of items) {
        await actualizarStock(receta.id, -(cant || 0));
      }
    }
    if (onRefresh) onRefresh();
    const names =
      consumoErrors.slice(0, 3).join(", ") +
      (consumoErrors.length > 3 ? "…" : "");
    throw new Error(
      `No se pudo descontar insumos para: ${names}. Stock no se modificó.`,
    );
  }

  showToast?.(`✅ Stock cargado: +${total} unidades`);
}
