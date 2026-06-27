import { useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

const PLAN_SELECT =
  "id, semana_inicio, receta_id, cantidad_planificada, cantidad_realizada, cantidad_por_dia";

export function usePlanSemanal({ onRefresh, onPlanChanged, showToast } = {}) {
  const fetchPlan = useCallback(async (semana_inicio) => {
    const { data, error } = await supabase.from("plan_semanal").select(PLAN_SELECT).eq("semana_inicio", semana_inicio);
    if (error) { console.error("[plan_semanal/fetchPlan]", error); throw error; }
    return data || [];
  }, []);

  const insertPlanRow = useCallback(async (row) => {
    const { error } = await supabase.from("plan_semanal").insert({
      semana_inicio: row.semana_inicio, receta_id: row.receta_id,
      cantidad_planificada: row.cantidad_planificada ?? 0,
      cantidad_realizada: row.cantidad_realizada ?? 0,
      cantidad_por_dia: row.cantidad_por_dia ?? null,
    });
    if (error) { console.error("[plan_semanal/insertPlanRow]", error); throw error; }
  }, []);

  const updatePlanRow = useCallback(async (id, payload) => {
    const { error } = await supabase.from("plan_semanal").update(payload).eq("id", id);
    if (error) { console.error("[plan_semanal/updatePlanRow]", error); throw error; }
  }, []);

  const deletePlanRow = useCallback(async (id) => {
    const { error } = await supabase.from("plan_semanal").delete().eq("id", id);
    if (error) { console.error("[plan_semanal/deletePlanRow]", error); throw error; }
  }, []);

  const upsertPlanRow = useCallback(
    async (row, { skipRefresh = false } = {}) => {
      const { error } = await supabase.from("plan_semanal").upsert({
        semana_inicio: row.semana_inicio, receta_id: row.receta_id,
        cantidad_planificada: row.cantidad_planificada ?? 0,
        cantidad_realizada: row.cantidad_realizada ?? 0,
        cantidad_por_dia: row.cantidad_por_dia ?? null,
      }, { onConflict: "semana_inicio,receta_id" });
      if (error) { console.error("[plan_semanal/upsertPlanRow]", error); throw error; }
      if (!skipRefresh) await onRefresh?.();
      onPlanChanged?.();
    },
    [onRefresh, onPlanChanged],
  );

  return { fetchPlan, insertPlanRow, updatePlanRow, deletePlanRow, upsertPlanRow };
}
