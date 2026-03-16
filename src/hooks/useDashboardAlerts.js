import { useMemo } from "react";
import { hoyLocalISO } from "../lib/dates";
import { agruparPedidos, gruposConDeuda as getGruposConDeuda, totalDebeEnGrupo } from "../lib/agrupadores";

/**
 * Calcula estructuras de datos para DashboardAlerts:
 * pedidos próximos, grupos con deuda, alertas de pedidos sin stock.
 */
export function useDashboardAlerts({ recetas, ventas, stock, pedidos }) {
  return useMemo(() => {
    const hoyStr = hoyLocalISO();
    const hoyDate = new Date(hoyStr);
    const MS_POR_DIA = 24 * 60 * 60 * 1000;

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
      pedidosHoyCount,
      pedidosManianaCountResumen,
      pedidosPasadoCount,
      pedidosAgrupadosProximos,
      pedidosList,
      alertasPedidosManiana,
      pedidosManianaPorReceta,
      gruposConDeuda,
      totalDeuda,
    };
  }, [recetas, ventas, stock, pedidos]);
}
