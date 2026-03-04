import { useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { reportError } from "../utils/errorReport";

function normalizeNombre(nombre) {
  return (nombre || "").trim();
}

export function useInsumos({ onRefresh, showToast } = {}) {
  const updateInsumo = useCallback(
    async (id, data) => {
      const { error } = await supabase
        .from("insumos")
        .update(data)
        .eq("id", id)
        .select("id, precio");
      if (error) throw error;
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
      if (selectError) throw selectError;
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
    if (error) throw error;
  }, []);

  const deleteInsumoComposicion = useCallback(
    async (insumo_id, insumo_id_componente) => {
      const { error } = await supabase
        .from("insumo_composicion")
        .delete()
        .eq("insumo_id", insumo_id)
        .eq("insumo_id_componente", insumo_id_componente);
      if (error) throw error;
      showToast?.("✅ Componente quitado");
      await onRefresh?.();
    },
    [onRefresh, showToast],
  );

  const upsertInsumoComposicion = useCallback(
    async (row) => {
      const { error } = await supabase
        .from("insumo_composicion")
        .upsert(row, { onConflict: "insumo_id,insumo_id_componente" });
      if (error) throw error;
      await onRefresh?.();
    },
    [onRefresh],
  );

  const deleteInsumo = useCallback(
    async (id) => {
      const { error } = await supabase.from("insumos").delete().eq("id", id);
      if (error) throw error;
      showToast?.("🗑️ Insumo eliminado");
      await onRefresh?.();
    },
    [onRefresh, showToast],
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
