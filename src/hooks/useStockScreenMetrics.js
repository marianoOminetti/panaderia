import { useMemo } from "react";
import {
  METRICAS_VENTANA_DIAS,
  DIAS_ALERTA_ROJA,
} from "../config/appConfig";
import {
  calcularMetricasVentasYStock,
  filterVentasUltimosDias,
} from "../lib/metrics";
import {
  computePedidosPendientesSemana,
  computePrioridadesProduccion,
} from "../lib/stockMetrics";

export function useStockScreenMetrics({ recetas, stock, ventas, pedidos }) {
  const ventasVentana = useMemo(
    () => filterVentasUltimosDias(ventas, METRICAS_VENTANA_DIAS),
    [ventas],
  );

  const metricasStock = useMemo(
    () =>
      calcularMetricasVentasYStock(
        recetas,
        ventasVentana,
        stock,
        METRICAS_VENTANA_DIAS,
      ),
    [recetas, ventasVentana, stock],
  );

  const pedidosPendientesSemana = useMemo(
    () => computePedidosPendientesSemana(pedidos),
    [pedidos],
  );

  const recetasOrdenadasPorStock = useMemo(
    () =>
      [...(recetas || [])].sort((a, b) => {
        const sa = (stock || {})[a.id] ?? 0;
        const sb = (stock || {})[b.id] ?? 0;
        if (sa !== sb) return sa - sb;
        return (a.nombre || "").localeCompare(b.nombre || "", "es", {
          sensitivity: "base",
        });
      }),
    [recetas, stock],
  );

  const prioridadesProduccion = useMemo(
    () =>
      computePrioridadesProduccion(
        recetas,
        stock,
        metricasStock,
        pedidosPendientesSemana,
      ),
    [recetas, stock, metricasStock, pedidosPendientesSemana],
  );

  const sinStockCount = useMemo(
    () =>
      (recetas || []).filter((r) => ((stock || {})[r.id] ?? 0) <= 0).length,
    [recetas, stock],
  );

  const bajo2Count = useMemo(
    () =>
      (recetas || []).filter((r) => {
        const m = metricasStock[r.id];
        return m && m.diasRestantes != null && m.diasRestantes < DIAS_ALERTA_ROJA;
      }).length,
    [recetas, metricasStock],
  );

  return {
    metricasStock,
    pedidosPendientesSemana,
    recetasOrdenadasPorStock,
    prioridadesProduccion,
    sinStockCount,
    bajo2Count,
  };
}
