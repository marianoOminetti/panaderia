import { useMemo } from "react";
import { hoyLocalISO } from "../lib/dates";
import { filterVentasUltimosDias } from "../lib/metrics";
import { METRICAS_VENTANA_DIAS } from "../config/appConfig";
import { buildStockInsights } from "../lib/insights";

export function useStockInsights({ enabled = true, ventas, recetas, stock }) {
  const hoyStr = hoyLocalISO();

  return useMemo(() => {
    if (!enabled) {
      return { all: [], hasUrgent: false };
    }
    const [y, m, d] = hoyStr.split("-").map(Number);
    const hoy = new Date(y, m - 1, d);
    const ventasVentana = filterVentasUltimosDias(ventas, METRICAS_VENTANA_DIAS);
    return buildStockInsights({
      ventas: ventasVentana,
      recetas,
      stock,
      hoy,
    });
  }, [enabled, ventas, recetas, stock, hoyStr]);
}
