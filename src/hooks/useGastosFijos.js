import { useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * CRUD de gastos fijos en Supabase (save, toggle activo, delete). Usado por GastosFijos.jsx.
 */
export function useGastosFijos({
  onRefresh,
  showToast,
  appendGasto,
  updateGastoInState,
  removeGasto,
} = {}) {
  const saveGastoFijo = useCallback(
    async (payload, editandoId) => {
      if (editandoId) {
        const optimistic = { ...payload, id: editandoId };
        updateGastoInState?.(optimistic);
        showToast?.("Guardando cambios…");
        const { error } = await supabase
          .from("gastos_fijos")
          .update(payload)
          .eq("id", editandoId);
        if (error) {
          console.error("[gastos_fijos/saveGastoFijo update]", error);
          await onRefresh?.();
          showToast?.("⚠️ Error al guardar");
          throw error;
        }
        showToast?.("✅ Gasto actualizado");
      } else {
        const pendingId = `pending-gasto-${Date.now()}`;
        appendGasto?.({ ...payload, id: pendingId, activo: payload.activo !== false });
        showToast?.("Guardando…");
        const { data, error } = await supabase
          .from("gastos_fijos")
          .insert(payload)
          .select("*")
          .single();
        if (error) {
          console.error("[gastos_fijos/saveGastoFijo insert]", error);
          removeGasto?.(pendingId);
          await onRefresh?.();
          showToast?.("⚠️ Error al guardar");
          throw error;
        }
        removeGasto?.(pendingId);
        appendGasto?.(data);
        showToast?.("✅ Gasto agregado");
      }
    },
    [onRefresh, showToast, appendGasto, updateGastoInState, removeGasto],
  );

  const toggleActivo = useCallback(
    async (g) => {
      const nextActivo = !g.activo;
      updateGastoInState?.({ ...g, activo: nextActivo });
      const { error } = await supabase
        .from("gastos_fijos")
        .update({ activo: nextActivo })
        .eq("id", g.id);
      if (error) {
        console.error("[gastos_fijos/toggleActivo]", error);
        updateGastoInState?.({ ...g, activo: g.activo });
        await onRefresh?.();
        throw error;
      }
    },
    [onRefresh, updateGastoInState],
  );

  const deleteGastoFijo = useCallback(
    async (g, options) => {
      const mode = options?.mode || "solo-futuro";
      showToast?.("Eliminando…");
      if (mode === "historico") {
        removeGasto?.(g.id);
        const { error } = await supabase.from("gastos_fijos").delete().eq("id", g.id);
        if (error) {
          console.error("[gastos_fijos/deleteGastoFijo hard]", error);
          appendGasto?.(g);
          await onRefresh?.();
          showToast?.("⚠️ Error al eliminar");
          throw error;
        }
        showToast?.("🗑️ Gasto eliminado de la base");
      } else {
        const patch = {
          activo: false,
          fecha_fin_vigencia: new Date().toISOString().slice(0, 10),
        };
        updateGastoInState?.({ ...g, ...patch });
        const { error } = await supabase
          .from("gastos_fijos")
          .update(patch)
          .eq("id", g.id);
        if (error) {
          console.error("[gastos_fijos/deleteGastoFijo soft]", error);
          updateGastoInState?.(g);
          await onRefresh?.();
          showToast?.("⚠️ Error al eliminar");
          throw error;
        }
        showToast?.("🗑️ Gasto movido a gastos pasados");
      }
    },
    [onRefresh, showToast, removeGasto, appendGasto, updateGastoInState],
  );

  return { saveGastoFijo, toggleActivo, deleteGastoFijo };
}
