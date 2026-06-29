import { useCallback } from "react";
import { normalizeNombreUpper, normalizeNombreUpperOrNull } from "../lib/normalizeNombre";
import { supabase } from "../lib/supabaseClient";

function normalizeRecetaPayload(payload) {
  const result = { ...payload };
  if (payload.nombre != null) {
    result.nombre = normalizeNombreUpper(payload.nombre);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "familia")) {
    result.familia = normalizeNombreUpperOrNull(payload.familia);
  }
  return result;
}

/**
 * Mutaciones de recetas e ingredientes en Supabase (update, insert, delete receta; ingredientes).
 * Usado por Recetas.jsx y RecetaModal. No carga la lista; eso lo hace useAppData.
 * @returns {{ updateReceta, insertReceta, deleteReceta, ... (ingredientes) }}
 */
export function useRecetas() {
  const updateReceta = useCallback(async (id, payload) => {
    const { data, error } = await supabase
      .from("recetas")
      .update(normalizeRecetaPayload(payload))
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.error("[recetas/updateReceta]", error);
      throw error;
    }
    return data;
  }, []);

  const insertReceta = useCallback(async (payload) => {
    const { data, error } = await supabase
      .from("recetas")
      .insert(normalizeRecetaPayload(payload))
      .select()
      .single();
    if (error) {
      console.error("[recetas/insertReceta]", error);
      throw error;
    }
    return data;
  }, []);

  const deleteRecetaIngredientes = useCallback(async (receta_id) => {
    await supabase.from("receta_ingredientes").delete().eq("receta_id", receta_id);
  }, []);

  const insertRecetaIngredientes = useCallback(async (rows) => {
    const { error } = await supabase.from("receta_ingredientes").insert(rows);
    if (error) {
      console.error("[recetas/insertRecetaIngredientes]", error);
      throw error;
    }
  }, []);

  const deleteReceta = useCallback(async (id) => {
    const { error } = await supabase.from("recetas").delete().eq("id", id);
    if (error) {
      console.error("[recetas/deleteReceta]", error);
      throw error;
    }
  }, []);

  return {
    updateReceta,
    insertReceta,
    deleteRecetaIngredientes,
    insertRecetaIngredientes,
    deleteReceta,
  };
}
