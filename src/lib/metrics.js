/**
 * Métricas de ventas y stock: promedio diario por receta, días restantes de stock (ventana configurable).
 * Usado por Dashboard, Analytics, alertas de stock.
 */
import {
  METRICAS_VENTANA_DIAS,
} from "../config/appConfig";

/** Calcula promedio diario de ventas y días de stock restante por receta usando una ventana de N días. */
export function calcularMetricasVentasYStock(recetas, ventas, stock, diasVentana = METRICAS_VENTANA_DIAS) {
  if (!recetas?.length || !ventas?.length || diasVentana <= 0) return {};
  const hoy = new Date();
  const MS_POR_DIA = 24 * 60 * 60 * 1000;
  const cantidadesPorReceta = {};

  for (const v of ventas) {
    if (!v || v.receta_id == null || !v.fecha) continue;
    const fechaVenta = new Date(v.fecha);
    if (Number.isNaN(fechaVenta.getTime())) continue;
    const diffDias = (hoy - fechaVenta) / MS_POR_DIA;
    if (diffDias < 0 || diffDias >= diasVentana) continue;
    const rid = v.receta_id;
    cantidadesPorReceta[rid] = (cantidadesPorReceta[rid] || 0) + (Number(v.cantidad) || 0);
  }

  const resultado = {};
  for (const r of recetas) {
    const totalVentana = cantidadesPorReceta[r.id] || 0;
    const promedioDiario = totalVentana / diasVentana;
    const stockActual = (stock || {})[r.id] ?? 0;
    const stockClamped = Math.max(0, stockActual);
    const diasRestantes = promedioDiario > 0 ? stockClamped / promedioDiario : null;
    resultado[r.id] = { promedioDiario, diasRestantes, totalVentana, stockActual };
  }
  return resultado;
}

export function formatearDiasStock(d) {
  if (d == null) return "—";
  if (d < 0.5) return "<0.5";
  if (Math.abs(d - 1) < 0.01) return "1";
  return d.toFixed(1);
}

