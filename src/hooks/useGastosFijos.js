import { useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * CRUD de gastos fijos en Supabase (save, toggle activo, delete). Usado por GastosFijos.jsx.
 * @param {{ onRefresh?: () => void, showToast?: (msg: string) => void }}
 * @returns {{ saveGastoFijo, toggleActivo, deleteGastoFijo }}
 */
export function useGastosFijos({ onRefresh, showToast } = {}) {
  const saveGastoFijo = useCallback(
    async (payload, editandoId) => {
      if (editandoId) {
        const { error } = await supabase
          .from("gastos_fijos")
          .update(payload)
          .eq("id", editandoId);
        if (error) {
          console.error("[gastos_fijos/saveGastoFijo update]", error);
          throw error;
        }
      showToast?.("✅ Gasto actualizado");
      } else {
        const { error } = await supabase.from("gastos_fijos").insert(payload);
        if (error) {
          console.error("[gastos_fijos/saveGastoFijo insert]", error);
          throw error;
        }
      showToast?.("✅ Gasto agregado");
      }
      await onRefresh?.();
    },
    [onRefresh, showToast],
  );

  const toggleActivo = useCallback(
    async (g) => {
      const { error } = await supabase
        .from("gastos_fijos")
        .update({ activo: !g.activo })
        .eq("id", g.id);
      if (error) {
        console.error("[gastos_fijos/toggleActivo]", error);
        throw error;
      }
      await onRefresh?.();
    },
    [onRefresh],
  );

  const deleteGastoFijo = useCallback(
    async (g, options) => {
      const mode = options?.mode || "solo-futuro";
      if (mode === "historico") {
        const { error } = await supabase
          .from("gastos_fijos")
          .delete()
          .eq("id", g.id);
        if (error) {
          console.error("[gastos_fijos/deleteGastoFijo hard]", error);
          throw error;
        }
        showToast?.("🗑️ Gasto eliminado de la base");
      } else {
        const { error } = await supabase
          .from("gastos_fijos")
          .update({
            activo: false,
            // Al eliminar solo hacia adelante, cerramos siempre la vigencia hoy
            // para que pase a gastos pasados.
            fecha_fin_vigencia: new Date().toISOString().slice(0, 10),
          })
          .eq("id", g.id);
        if (error) {
          console.error("[gastos_fijos/deleteGastoFijo soft]", error);
          throw error;
        }
        showToast?.("🗑️ Gasto movido a gastos pasados");
      }
      await onRefresh?.();
    },
    [onRefresh, showToast],
  );

  return { saveGastoFijo, toggleActivo, deleteGastoFijo };
}
