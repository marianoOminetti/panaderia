import { useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Mutaciones de recetas e ingredientes en Supabase (update, insert, delete receta; ingredientes).
 * Usado por Recetas.jsx y RecetaModal. No carga la lista; eso lo hace useAppData.
 * @returns {{ updateReceta, insertReceta, deleteReceta, ... (ingredientes) }}
 */
export function useRecetas() {
  const updateReceta = useCallback(async (id, payload) => {
    const { error } = await supabase.from("recetas").update(payload).eq("id", id);
    if (error) {
      console.error("[recetas/updateReceta]", error);
      throw error;
    }
  }, []);

  const insertReceta = useCallback(async (payload) => {
    const { data, error } = await supabase
      .from("recetas")
      .insert(payload)
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
