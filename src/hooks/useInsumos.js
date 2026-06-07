import { useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { reportError } from "../utils/errorReport";

function normalizeNombre(nombre) {
  return (nombre || "").trim();
}

/**
 * CRUD de insumos en Supabase (update, insert, delete, precio historial, composición). No carga la lista; eso lo hace useAppData.
 * Usado por Insumos.jsx (pasa callbacks a useInsumosCompra y useInsumosLista).
 * @param {{ onRefresh?: () => void, showToast?: (msg: string) => void }}
 * @returns {{ updateInsumo, insertInsumo, deleteInsumo, insertPrecioHistorial, updateRecetaCostos, ... }}
 */
export function useInsumos({
  onRefresh,
  showToast,
  removeInsumo,
  upsertInsumoComposicionInState,
  removeInsumoComposicionInState,
} = {}) {
  const updateInsumo = useCallback(
    async (id, data) => {
      const { error } = await supabase
        .from("insumos")
        .update(data)
        .eq("id", id)
        .select("id, precio");
      if (error) {
        console.error("[insumos/updateInsumo]", error);
        throw error;
      }
    },
    [],
  );

  const insertInsumo = useCallback(
    async (data) => {
      const nombre = normalizeNombre(data.nombre);
      const categoria = data.categoria ?? null;

      if (!nombre) {
        const error = new Error("Nombre de insumo requerido");
        error.code = "INSUMO_SIN_NOMBRE";
        throw error;
      }

      // Evitar duplicados antes de golpear la UNIQUE constraint
      const { data: existentes, error: selectError } = await supabase
        .from("insumos")
        .select("id")
        .eq("nombre", nombre)
        .eq("categoria", categoria)
        .limit(1);
      if (selectError) {
        console.error("[insumos/insertInsumo select]", selectError);
        throw selectError;
      }
      if (existentes && existentes.length > 0) {
        showToast?.("Ya existe un insumo con ese nombre y categoría");
        const dupError = new Error("INSUMO_DUPLICADO");
        dupError.code = "INSUMO_DUPLICADO";
        throw dupError;
      }

      const { data: row, error } = await supabase
        .from("insumos")
        .insert({ ...data, nombre, categoria })
        .select("id, precio")
        .single();
      if (error) {
        if (error.code === "23505") {
          // UNIQUE violation como red de seguridad
          showToast?.("Ya existe un insumo con ese nombre y categoría");
          const dupError = new Error("INSUMO_DUPLICADO");
          dupError.code = "INSUMO_DUPLICADO";
          throw dupError;
        }
        console.error("[insumos/insertInsumo]", error);
        throw error;
      }
      return row;
    },
    [showToast],
  );

  const insertPrecioHistorial = useCallback(async (row) => {
    const { error } = await supabase.from("precio_historial").insert(row);
    if (error) {
      reportError(error, {
        action: "insertPrecioHistorial",
        insumo_id: row.insumo_id,
      });
      throw error;
    }
  }, []);

  const updateRecetaCostos = useCallback(async (recetaId, { costo_lote, costo_unitario }) => {
    const { error } = await supabase
      .from("recetas")
      .update({ costo_lote, costo_unitario })
      .eq("id", recetaId);
    if (error) {
      console.error("[insumos/updateRecetaCostos]", error);
      throw error;
    }
  }, []);

  const deleteInsumoComposicion = useCallback(
    async (insumo_id, insumo_id_componente) => {
      removeInsumoComposicionInState?.(insumo_id, insumo_id_componente);
      const { error } = await supabase
        .from("insumo_composicion")
        .delete()
        .eq("insumo_id", insumo_id)
        .eq("insumo_id_componente", insumo_id_componente);
      if (error) {
        console.error("[insumos/deleteInsumoComposicion]", error);
        await onRefresh?.();
        throw error;
      }
      showToast?.("✅ Componente quitado");
    },
    [onRefresh, showToast, removeInsumoComposicionInState],
  );

  const upsertInsumoComposicion = useCallback(
    async (row) => {
      upsertInsumoComposicionInState?.(row);
      const { error } = await supabase
        .from("insumo_composicion")
        .upsert(row, { onConflict: "insumo_id,insumo_id_componente" });
      if (error) {
        console.error("[insumos/upsertInsumoComposicion]", error);
        await onRefresh?.();
        throw error;
      }
    },
    [onRefresh, upsertInsumoComposicionInState],
  );

  const deleteInsumo = useCallback(
    async (id) => {
      removeInsumo?.(id);
      showToast?.("Eliminando…");
      const { error } = await supabase.from("insumos").delete().eq("id", id);
      if (error) {
        console.error("[insumos/deleteInsumo]", error);
        await onRefresh?.();
        showToast?.("⚠️ No se pudo eliminar (en uso en recetas o movimientos)");
        throw error;
      }
      showToast?.("🗑️ Insumo eliminado");
      if (!removeInsumo) await onRefresh?.();
    },
    [onRefresh, showToast, removeInsumo],
  );

  return {
    updateInsumo,
    insertInsumo,
    insertPrecioHistorial,
    updateRecetaCostos,
    deleteInsumoComposicion,
    upsertInsumoComposicion,
    deleteInsumo,
  };
}
