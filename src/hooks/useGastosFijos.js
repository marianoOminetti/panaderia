import { useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export function useGastosFijos({ onRefresh, showToast } = {}) {
  const saveGastoFijo = useCallback(
    async (payload, editandoId) => {
      if (editandoId) {
        const { error } = await supabase
          .from("gastos_fijos")
          .update(payload)
          .eq("id", editandoId);
        if (error) throw error;
        showToast?.("✅ Gasto fijo actualizado");
      } else {
        const { error } = await supabase.from("gastos_fijos").insert(payload);
        if (error) throw error;
        showToast?.("✅ Gasto fijo agregado");
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
      if (error) throw error;
      await onRefresh?.();
    },
    [onRefresh],
  );

  const deleteGastoFijo = useCallback(
    async (g) => {
      const { error } = await supabase
        .from("gastos_fijos")
        .delete()
        .eq("id", g.id);
      if (error) throw error;
      showToast?.("🗑️ Gasto fijo eliminado");
      await onRefresh?.();
    },
    [onRefresh, showToast],
  );

  return { saveGastoFijo, toggleActivo, deleteGastoFijo };
}
