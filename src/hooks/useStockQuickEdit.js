import { useState, useCallback, useRef } from "react";
import { ejecutarCargaStock } from "../lib/ejecutarCargaStock";
import { getInsumosEnCeroParaRecetas } from "../lib/stockPlan";

/**
 * Edición rápida de stock: abre modal bottom-sheet sin cambiar de tab.
 * Usado desde Insights y otras pantallas con alertas de stock.
 */
export function useStockQuickEdit({
  recetas,
  recetaIngredientes,
  insumos,
  insumoComposicion,
  insumoStock,
  stock,
  actualizarStock,
  actualizarStockBatch,
  consumirInsumosPorStock,
  onRefresh,
  showToast,
  onOpenInsumosCompra,
}) {
  const [open, setOpen] = useState(false);
  const [receta, setReceta] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [contextHint, setContextHint] = useState("");

  const openQuickEdit = useCallback(
    (recetaOrId, { cantidad: qty = 1, hint = "" } = {}) => {
      const r =
        typeof recetaOrId === "object"
          ? recetaOrId
          : (recetas || []).find((x) => x.id === recetaOrId);
      if (!r?.id) return;
      setReceta(r);
      setCantidad(Math.max(1, Math.round(qty)));
      setContextHint(hint || "");
      setOpen(true);
    },
    [recetas],
  );

  const closeQuickEdit = useCallback(() => {
    if (saving) return;
    setOpen(false);
    setReceta(null);
    setContextHint("");
  }, [saving]);

  const confirmQuickEdit = useCallback(async () => {
    if (!receta?.id || cantidad <= 0 || savingRef.current) return;
    const items = [{ receta, cantidad }];
    const insumosEnCero = getInsumosEnCeroParaRecetas(
      items,
      recetaIngredientes,
      insumos,
      insumoComposicion,
      insumoStock,
      recetas,
    );

    savingRef.current = true;
    setSaving(true);
    try {
      await ejecutarCargaStock({
        items,
        recetas,
        recetaIngredientes,
        actualizarStock,
        actualizarStockBatch,
        consumirInsumosPorStock,
        onRefresh,
        showToast,
      });
      setOpen(false);
      setReceta(null);
      setContextHint("");
      if (insumosEnCero.length > 0) {
        onOpenInsumosCompra?.(insumosEnCero);
      }
    } catch (err) {
      const msg = err?.message ? String(err.message).slice(0, 80) : "";
      showToast?.(
        msg
          ? `⚠️ Error al cargar stock: ${msg}`
          : "⚠️ Error al cargar stock. Probá de nuevo.",
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [
    receta,
    cantidad,
    recetaIngredientes,
    insumos,
    insumoComposicion,
    insumoStock,
    recetas,
    actualizarStock,
    actualizarStockBatch,
    consumirInsumosPorStock,
    onRefresh,
    showToast,
    onOpenInsumosCompra,
  ]);

  const stockActual = receta ? ((stock || {})[receta.id] ?? 0) : 0;

  return {
    openQuickEdit,
    closeQuickEdit,
    confirmQuickEdit,
    modalProps: {
      open,
      receta,
      stockActual,
      cantidad,
      setCantidad,
      contextHint,
      saving,
      onClose: closeQuickEdit,
      onConfirm: confirmQuickEdit,
    },
  };
}
