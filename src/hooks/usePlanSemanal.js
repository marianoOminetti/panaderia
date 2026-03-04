import { useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export function usePlanSemanal({ onRefresh, onPlanChanged, showToast } = {}) {
  const fetchPlan = useCallback(async (semana_inicio) => {
    const { data, error } = await supabase
      .from("plan_semanal")
      .select(
        "id, semana_inicio, receta_id, cantidad_planificada, cantidad_realizada",
      )
      .eq("semana_inicio", semana_inicio);
    if (error) throw error;
    return data || [];
  }, []);

  const insertPlanRow = useCallback(async (row) => {
    const { error } = await supabase.from("plan_semanal").insert({
      semana_inicio: row.semana_inicio,
      receta_id: row.receta_id,
      cantidad_planificada: row.cantidad_planificada ?? 0,
      cantidad_realizada: row.cantidad_realizada ?? 0,
    });
    if (error) throw error;
  }, []);

  const updatePlanRow = useCallback(async (id, payload) => {
    const { error } = await supabase
      .from("plan_semanal")
      .update(payload)
      .eq("id", id);
    if (error) throw error;
  }, []);

  const deletePlanRow = useCallback(async (id) => {
    const { error } = await supabase
      .from("plan_semanal")
      .delete()
      .eq("id", id);
    if (error) throw error;
  }, []);

  const upsertPlanRow = useCallback(
    async (row) => {
      const { error } = await supabase.from("plan_semanal").upsert(
        {
          semana_inicio: row.semana_inicio,
          receta_id: row.receta_id,
          cantidad_planificada: row.cantidad_planificada ?? 0,
          cantidad_realizada: row.cantidad_realizada ?? 0,
        },
        { onConflict: "semana_inicio,receta_id" },
      );
      if (error) throw error;
      await onRefresh?.();
      onPlanChanged?.();
    },
    [onRefresh, onPlanChanged],
  );

  return {
    fetchPlan,
    insertPlanRow,
    updatePlanRow,
    deletePlanRow,
    upsertPlanRow,
  };
}
