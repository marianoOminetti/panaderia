import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { getSemanaInicioISO } from "../lib/dates";
import { calcularRequerimientoInsumosParaItems } from "../lib/stockPlan";

export function usePlanResumen({
  recetas,
  recetaIngredientes,
  insumos,
  insumoComposicion,
  insumoStock,
  planSemanalVersion,
}) {
  const [resumenPlanSemanal, setResumenPlanSemanal] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const cargarResumen = async () => {
      if (!recetas?.length) {
        if (!cancelled) setResumenPlanSemanal(null);
        return;
      }
      const semanaInicio = getSemanaInicioISO();
      try {
        const { data, error } = await supabase
          .from("plan_semanal")
          .select("receta_id, cantidad_planificada, cantidad_realizada")
          .eq("semana_inicio", semanaInicio);
        if (error) {
          if (!cancelled) setResumenPlanSemanal(null);
          return;
        }

        let totalPlanificadas = 0;
        const itemsPendientes = [];
        for (const row of data || []) {
          const receta = recetas.find((r) => r.id === row.receta_id);
          if (!receta) continue;
          const plan = Number(row.cantidad_planificada || 0);
          const realizado = Number(row.cantidad_realizada || 0);
          if (plan > 0) totalPlanificadas += plan;
          const pendiente = Math.max(plan - realizado, 0);
          if (pendiente > 0) {
            itemsPendientes.push({ receta, cantidad: pendiente });
          }
        }

        if (!itemsPendientes.length) {
          if (!cancelled)
            setResumenPlanSemanal({ totalUnidades: totalPlanificadas, totalCompra: 0 });
          return;
        }

        const requerimientos = calcularRequerimientoInsumosParaItems(
          itemsPendientes,
          recetaIngredientes,
          insumos,
          insumoComposicion,
          recetas,
        );

        let totalCompra = 0;
        for (const req of requerimientos) {
          const stockActual = (insumoStock || {})[req.insumo_id] ?? 0;
          const faltante = Math.max(0, (req.cantidad || 0) - stockActual);
          const insumo = req.insumo;
          if (
            faltante > 0 &&
            insumo &&
            insumo.cantidad_presentacion > 0 &&
            insumo.precio != null
          ) {
            const precioUnitario = insumo.precio / insumo.cantidad_presentacion;
            totalCompra += precioUnitario * faltante;
          }
        }

        if (!cancelled)
          setResumenPlanSemanal({ totalUnidades: totalPlanificadas, totalCompra });
      } catch {
        if (!cancelled) setResumenPlanSemanal(null);
      }
    };

    cargarResumen();
    return () => {
      cancelled = true;
    };
  }, [insumoComposicion, insumoStock, insumos, planSemanalVersion, recetaIngredientes, recetas]);

  return resumenPlanSemanal;
}

