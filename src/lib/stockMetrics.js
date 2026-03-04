import { DIAS_ALERTA_AMARILLA } from "../config/appConfig";

/**
 * Devuelve un objeto { [receta_id]: cantidad } con pedidos pendientes de la semana actual (lunes a domingo).
 */
export function computePedidosPendientesSemana(pedidos) {
  const out = {};
  if (!pedidos?.length) return out;
  const hoy = new Date();
  const diaSemana = hoy.getDay();
  const diffLunes = (diaSemana + 6) % 7;
  const lunes = new Date(hoy);
  lunes.setHours(0, 0, 0, 0);
  lunes.setDate(hoy.getDate() - diffLunes);
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  domingo.setHours(23, 59, 59, 999);
  for (const p of pedidos) {
    if (!p || !p.fecha_entrega || p.estado === "entregado") continue;
    let fecha;
    try {
      fecha = new Date(p.fecha_entrega);
    } catch {
      continue;
    }
    if (Number.isNaN(fecha.getTime())) continue;
    if (fecha < lunes || fecha > domingo) continue;
    const rid = p.receta_id;
    if (rid == null) continue;
    out[rid] = (out[rid] || 0) + (p.cantidad || 0);
  }
  return out;
}

/**
 * Lista de prioridades de producción (hasta 6): sin stock, con pedidos o con pocos días.
 */
export function computePrioridadesProduccion(
  recetas,
  stock,
  metricasStock,
  pedidosPendientesSemana,
) {
  return [...recetas]
    .map((r) => {
      const cant = (stock || {})[r.id] ?? 0;
      const m = metricasStock[r.id];
      const dias = m?.diasRestantes ?? Number.POSITIVE_INFINITY;
      const pedidosSemana = pedidosPendientesSemana[r.id] || 0;
      const faltaPedidos = Math.max(0, pedidosSemana - cant);
      const prioridadScore =
        (cant <= 0 ? 2 : 0) +
        (faltaPedidos > 0 ? 1.5 : 0) +
        (Number.isFinite(dias) ? 1 / (dias + 0.1) : 0);
      return {
        receta: r,
        stockActual: cant,
        metrica: m,
        diasRestantes: dias,
        pedidosSemana,
        faltaPedidos,
        prioridadScore,
      };
    })
    .filter(
      (p) =>
        p.stockActual <= 0 ||
        p.faltaPedidos > 0 ||
        (Number.isFinite(p.diasRestantes) &&
          p.diasRestantes < DIAS_ALERTA_AMARILLA),
    )
    .sort((a, b) => b.prioridadScore - a.prioridadScore)
    .slice(0, 6);
}
