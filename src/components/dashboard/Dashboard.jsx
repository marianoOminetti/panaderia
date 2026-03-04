import { fmt } from "../../lib/format";
import { hoyLocalISO } from "../../lib/dates";
import {
  DIAS_ALERTA_ROJA,
  DIAS_ALERTA_AMARILLA,
  METRICAS_VENTANA_DIAS,
} from "../../config/appConfig";
import { agruparVentas, agruparPedidos, gruposConDeuda as getGruposConDeuda, totalDebeEnGrupo } from "../../lib/agrupadores";
import { calcularMetricasVentasYStock } from "../../lib/metrics";
import DashboardMetrics from "./DashboardMetrics";
import DashboardAlerts from "./DashboardAlerts";
import DashboardQuickGrid from "./DashboardQuickGrid";

function Dashboard({
  insumos,
  recetas,
  ventas,
  clientes,
  stock,
  pedidos,
  resumenPlanSemanal,
  onNavigate,
  onOpenCargarProduccion,
  onOpenGrupoDeuda,
}) {
  const hoyStr = hoyLocalISO();
  const hoyDate = new Date(hoyStr);
  const MS_POR_DIA = 24 * 60 * 60 * 1000;
  const ventasHoy = ventas.filter((v) => v.fecha === hoyStr);
  const ingresoHoy = ventasHoy.reduce(
    (s, v) =>
      s +
      (v.total_final != null
        ? v.total_final
        : (v.precio_unitario || 0) * (v.cantidad || 0)),
    0
  );
  const unidadesHoy = ventasHoy.reduce((s, v) => s + v.cantidad, 0);
  const stockBajo = recetas.filter((r) => ((stock || {})[r.id] ?? 0) <= 0);
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
  const debeTotal = ventas
    .filter((v) => v.estado_pago === "debe")
    .reduce(
      (s, v) =>
        s +
        (v.total_final != null
          ? v.total_final
          : (v.precio_unitario || 0) * (v.cantidad || 0)),
      0
    );

  const metricasStock = calcularMetricasVentasYStock(
    recetas,
    ventas,
    stock,
    METRICAS_VENTANA_DIAS
  );
  const alertaRoja = recetas.filter((r) => {
    const m = metricasStock[r.id];
    return m && m.diasRestantes != null && m.diasRestantes < DIAS_ALERTA_ROJA;
  });
  const alertaAmarilla = recetas.filter((r) => {
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
    return diffDias >= 0 && diffDias <= 2; // hoy y próximos 2 días
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

  const alertasPedidosManiana = recetas.filter((r) => {
    const pedidosCant = pedidosManianaPorReceta[r.id] || 0;
    if (!pedidosCant) return false;
    const stockActual = (stock || {})[r.id] ?? 0;
    return stockActual < pedidosCant;
  });

  const gruposConDeuda = getGruposConDeuda(ventas || []);
  const totalDeuda = gruposConDeuda.reduce((s, g) => s + totalDebeEnGrupo(g), 0);

  return (
    <div className="content">
      <DashboardMetrics
        ingresoHoy={ingresoHoy}
        unidadesHoy={unidadesHoy}
        debeTotal={debeTotal}
        resumenPlanSemanal={resumenPlanSemanal}
      />

      <DashboardAlerts
        stockBajo={stockBajo}
        recetasMargenBajo={recetasMargenBajo}
        pedidosHoyCount={pedidosHoyCount}
        pedidosManianaCountResumen={pedidosManianaCountResumen}
        gruposConDeuda={gruposConDeuda}
        totalDeuda={totalDeuda}
        pedidosAgrupadosProximos={pedidosAgrupadosProximos}
        pedidosPasadoCount={pedidosPasadoCount}
        pedidosList={pedidosList}
        alertasPedidosManiana={alertasPedidosManiana}
        pedidosManianaPorReceta={pedidosManianaPorReceta}
        alertaRoja={alertaRoja}
        alertaAmarilla={alertaAmarilla}
        metricasStock={metricasStock}
        clientes={clientes}
        stock={stock}
        onNavigate={onNavigate}
        onOpenCargarProduccion={onOpenCargarProduccion}
        onOpenGrupoDeuda={onOpenGrupoDeuda}
      />

      <DashboardQuickGrid
        stockBajo={stockBajo}
        recetasMargenBajo={recetasMargenBajo}
        clientesCount={clientes?.length || 0}
        insumosCount={insumos?.length || 0}
        recetasCount={recetas?.length || 0}
        onNavigate={onNavigate}
      />

      {ventasHoy.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Últimas ventas hoy</span>
            <button
              type="button"
              className="card-link"
              onClick={() => onNavigate?.("ventas")}
            >
              Ver todas →
            </button>
          </div>
          {agruparVentas(ventasHoy)
            .slice(0, 5)
            .map((grupo) => {
              const cliente = (clientes || []).find(
                (c) => c.id === grupo.cliente_id
              );
              return (
                <div
                  key={grupo.key}
                  className="venta-item venta-item-simple"
                  style={{ padding: "10px 0" }}
                >
                  <span className="venta-emoji">
                    {(
                      recetas.find(
                        (r) => r.id === grupo.items[0]?.receta_id
                      )
                    )?.emoji || "🍞"}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>
                      Cliente: {cliente?.nombre || "—"}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                      }}
                    >
                      {grupo.items
                        .map((v) => {
                          const r = recetas.find(
                            (rr) => rr.id === v.receta_id
                          );
                          return `${r?.nombre || "—"} x${v.cantidad}`;
                        })
                        .join(", ")}
                    </div>
                  </div>
                  <div
                    style={{
                      fontWeight: 600,
                      color: "var(--green)",
                    }}
                  >
                    {fmt(grupo.total)}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {ventasHoy.length === 0 && (
        <div className="empty">
          <div className="empty-icon">🥐</div>
          <p>
            No hay ventas hoy.
            <br />
            Tocá <strong>Registrar venta</strong> para empezar.
          </p>
          <button
            className="btn-primary"
            style={{ marginTop: 16 }}
            onClick={() => onNavigate?.("ventas")}
          >
            Ir a Ventas
          </button>
        </div>
      )}
    </div>
  );
}

export default Dashboard;

