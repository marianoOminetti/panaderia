/**
 * Pantalla Inicio/Dashboard: métricas del día, alertas (useDashboardAlerts + DashboardAlerts) y grilla de accesos rápidos (DashboardQuickGrid).
 * Recibe datos y callbacks de navegación desde AppContent.
 */
import { fmt } from "../../lib/format";
import { hoyLocalISO } from "../../lib/dates";
import { costoUnitarioPorRecetaMap } from "../../lib/costos";
import { agruparVentas } from "../../lib/agrupadores";
import { useDashboardAlerts } from "../../hooks/useDashboardAlerts";
import DashboardMetrics from "./DashboardMetrics";
import DashboardAlerts from "./DashboardAlerts";
import DashboardQuickGrid from "./DashboardQuickGrid";

function Dashboard({
  insumos,
  recetas,
  recetaIngredientes,
  ventas,
  clientes,
  stock,
  pedidos,
  onNavigate,
  onOpenCargarProduccion,
  onOpenGrupoDeuda,
  onOpenNuevaVenta,
  onOpenCargarStock,
}) {
  const hoyStr = hoyLocalISO();
  const ventasHoy = ventas.filter((v) => v.fecha === hoyStr);
  const ingresoHoy = ventasHoy.reduce(
    (s, v) =>
      s +
      (v.total_final != null
        ? v.total_final
        : (v.precio_unitario || 0) * (v.cantidad || 0)),
    0
  );
  const costoUnitarioPorReceta = costoUnitarioPorRecetaMap(
    recetas || [],
    recetaIngredientes || [],
    insumos || []
  );
  const costHoy = ventasHoy.reduce((s, v) => {
    const cu = costoUnitarioPorReceta[v.receta_id];
    if (cu == null) return s;
    const cant = Number(v.cantidad) || 0;
    return s + cu * cant;
  }, 0);
  const margenHoy = ingresoHoy - costHoy;
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

  const alerts = useDashboardAlerts({ recetas, ventas, stock, pedidos });

  return (
    <div className="content">
      <DashboardMetrics
        ingresoHoy={ingresoHoy}
        debeTotal={debeTotal}
        margenHoy={margenHoy}
      />

      <DashboardAlerts
        stockBajo={alerts.stockBajo}
        recetasMargenBajo={alerts.recetasMargenBajo}
        pedidosHoyCount={alerts.pedidosHoyCount}
        pedidosManianaCountResumen={alerts.pedidosManianaCountResumen}
        gruposConDeuda={alerts.gruposConDeuda}
        totalDeuda={alerts.totalDeuda}
        pedidosAgrupadosProximos={alerts.pedidosAgrupadosProximos}
        pedidosPasadoCount={alerts.pedidosPasadoCount}
        pedidosList={alerts.pedidosList}
        alertasPedidosManiana={alerts.alertasPedidosManiana}
        pedidosManianaPorReceta={alerts.pedidosManianaPorReceta}
        alertaRoja={alerts.alertaRoja}
        alertaAmarilla={alerts.alertaAmarilla}
        metricasStock={alerts.metricasStock}
        clientes={clientes}
        stock={stock}
        onNavigate={onNavigate}
        onOpenCargarProduccion={onOpenCargarProduccion}
        onOpenGrupoDeuda={onOpenGrupoDeuda}
      />

      <DashboardQuickGrid
        stockBajo={alerts.stockBajo}
        recetasMargenBajo={alerts.recetasMargenBajo}
        clientesCount={clientes?.length || 0}
        insumosCount={insumos?.length || 0}
        recetasCount={recetas?.length || 0}
        onNavigate={onNavigate}
        onOpenNuevaVenta={onOpenNuevaVenta}
        onOpenCargarStock={onOpenCargarStock}
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

