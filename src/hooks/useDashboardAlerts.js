import { useMemo } from "react";
import { hoyLocalISO } from "../lib/dates";
import {
  DIAS_ALERTA_ROJA,
  DIAS_ALERTA_AMARILLA,
  METRICAS_VENTANA_DIAS,
} from "../config/appConfig";
import { agruparPedidos, gruposConDeuda as getGruposConDeuda, totalDebeEnGrupo } from "../lib/agrupadores";
import { calcularMetricasVentasYStock } from "../lib/metrics";

/**
 * Calcula todas las estructuras de datos que alimentan DashboardAlerts y DashboardQuickGrid:
 * stock bajo, margen bajo, pedidos próximos, grupos con deuda, alertas roja/amarilla, etc.
 * Recibe datos crudos y devuelve valores derivados (sin cambiar lógica ni fórmulas).
 */
export function useDashboardAlerts({ recetas, ventas, stock, pedidos }) {
  return useMemo(() => {
    const hoyStr = hoyLocalISO();
    const hoyDate = new Date(hoyStr);
    const MS_POR_DIA = 24 * 60 * 60 * 1000;

    const stockBajo = (recetas || []).filter((r) => ((stock || {})[r.id] ?? 0) <= 0);
    const recetasMargenBajo = (recetas || []).filter((r) => {
      const precio = Number(r.precio_venta) || 0;
      const costoUnit =
        typeof r.costo_unitario === "number"
          ? Number(r.costo_unitario)
          : null;
      if (!precio || costoUnit == null || !isFinite(costoUnit)) return false;
      const margenVal = (precio - costoUnit) / precio;
      return margenVal < 0.5;
    });

    const metricasStock = calcularMetricasVentasYStock(
      recetas || [],
      ventas || [],
      stock || {},
      METRICAS_VENTANA_DIAS
    );
    const alertaRoja = (recetas || []).filter((r) => {
      const m = metricasStock[r.id];
      return m && m.diasRestantes != null && m.diasRestantes < DIAS_ALERTA_ROJA;
    });
    const alertaAmarilla = (recetas || []).filter((r) => {
      const m = metricasStock[r.id];
      return (
        m &&
        m.diasRestantes != null &&
        m.diasRestantes >= DIAS_ALERTA_ROJA &&
        m.diasRestantes < DIAS_ALERTA_AMARILLA
      );
    });

    const pedidosList = pedidos || [];
    const pedidosConFecha = pedidosList.filter((p) => p && p.fecha_entrega);
    const pedidosNormalizados = pedidosConFecha
      .map((p) => {
        try {
          const fechaDate = new Date(p.fecha_entrega);
          if (Number.isNaN(fechaDate.getTime())) return null;
          return { ...p, _fechaDate: fechaDate };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const pedidosProximos = pedidosNormalizados.filter((p) => {
      if (p.estado === "entregado") return false;
      const diffDias = Math.floor(
        (p._fechaDate.getTime() - hoyDate.getTime()) / MS_POR_DIA
      );
      return diffDias >= 0 && diffDias <= 2;
    });

    const pedidosAgrupadosProximos = agruparPedidos(pedidosProximos);

    const pedidosPorDia = { 0: 0, 1: 0, 2: 0 };
    for (const p of pedidosProximos) {
      const diffDias = Math.floor(
        (p._fechaDate.getTime() - hoyDate.getTime()) / MS_POR_DIA
      );
      if (diffDias >= 0 && diffDias <= 2) {
        pedidosPorDia[diffDias] = (pedidosPorDia[diffDias] || 0) + 1;
      }
    }
    const pedidosHoyCount = pedidosPorDia[0] || 0;
    const pedidosManianaCountResumen = pedidosPorDia[1] || 0;
    const pedidosPasadoCount = pedidosPorDia[2] || 0;

    const pedidosManiana = pedidosNormalizados.filter((p) => {
      if (p.estado === "entregado") return false;
      const diffDias = Math.floor(
        (p._fechaDate.getTime() - hoyDate.getTime()) / MS_POR_DIA
      );
      return diffDias === 1;
    });

    const pedidosManianaPorReceta = {};
    for (const p of pedidosManiana) {
      const rid = p.receta_id;
      if (rid == null) continue;
      pedidosManianaPorReceta[rid] =
        (pedidosManianaPorReceta[rid] || 0) + (p.cantidad || 0);
    }

    const alertasPedidosManiana = (recetas || []).filter((r) => {
      const pedidosCant = pedidosManianaPorReceta[r.id] || 0;
      if (!pedidosCant) return false;
      const stockActual = (stock || {})[r.id] ?? 0;
      return stockActual < pedidosCant;
    });

    const gruposConDeuda = getGruposConDeuda(ventas || []);
    const totalDeuda = gruposConDeuda.reduce((s, g) => s + totalDebeEnGrupo(g), 0);

    return {
      stockBajo,
      recetasMargenBajo,
      pedidosHoyCount,
      pedidosManianaCountResumen,
      pedidosPasadoCount,
      pedidosAgrupadosProximos,
      pedidosList,
      alertasPedidosManiana,
      pedidosManianaPorReceta,
      alertaRoja,
      alertaAmarilla,
      metricasStock,
      gruposConDeuda,
      totalDeuda,
    };
  }, [recetas, ventas, stock, pedidos]);
}
