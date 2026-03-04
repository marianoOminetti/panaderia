import { useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export function useRecetas() {
  const updateReceta = useCallback(async (id, payload) => {
    const { error } = await supabase.from("recetas").update(payload).eq("id", id);
    if (error) throw error;
  }, []);

  const insertReceta = useCallback(async (payload) => {
    const { data, error } = await supabase
      .from("recetas")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }, []);

  const deleteRecetaIngredientes = useCallback(async (receta_id) => {
    await supabase.from("receta_ingredientes").delete().eq("receta_id", receta_id);
  }, []);

  const insertRecetaIngredientes = useCallback(async (rows) => {
    const { error } = await supabase.from("receta_ingredientes").insert(rows);
    if (error) throw error;
  }, []);

  const deleteReceta = useCallback(async (id) => {
    const { error } = await supabase.from("recetas").delete().eq("id", id);
    if (error) throw error;
  }, []);

  return {
    updateReceta,
    insertReceta,
    deleteRecetaIngredientes,
    insertRecetaIngredientes,
    deleteReceta,
  };
}
