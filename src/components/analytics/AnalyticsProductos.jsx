import { fmt } from "../../lib/format";

function AnalyticsProductos({
  diaPicoLabel,
  horaPicoLabel,
  mejorCliente,
  mejorClienteTotal,
  proyIngresoMes,
  ingresoMes,
  diasTranscurridos,
  proyGananciaMesNeta,
  gananciaMesNeta,
  recetasSinVenta7,
}) {
  return (
    <div className="analytics-section">
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            Pico de ventas y cliente del mes
          </span>
        </div>
        <div className="analytics-kpi-grid">
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">
              Día y hora con más ventas
            </div>
            <div className="analytics-kpi-value">
              {diaPicoLabel}
            </div>
            <div className="analytics-kpi-sub">
              Horario pico: {horaPicoLabel}
            </div>
          </div>
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">
              Cliente que más compró este mes
            </div>
            <div className="analytics-kpi-value">
              {mejorCliente ? mejorCliente.nombre : "—"}
            </div>
            <div className="analytics-kpi-sub">
              {mejorCliente
                ? `Total: ${fmt(mejorClienteTotal)}`
                : "Todavía no hay compras este mes"}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Proyección del mes</span>
        </div>
        <div className="analytics-kpi-grid">
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">
              Ingreso proyectado
            </div>
            <div className="analytics-kpi-value">
              {fmt(proyIngresoMes || 0)}
            </div>
            <div className="analytics-kpi-sub">
              Acumulado: {fmt(ingresoMes)} en {diasTranscurridos} día(s)
            </div>
          </div>
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">
              Ganancia neta proyectada
            </div>
            <div className="analytics-kpi-value">
              {fmt(proyGananciaMesNeta || 0)}
            </div>
            <div className="analytics-kpi-sub">
              Acumulado neto: {fmt(gananciaMesNeta)}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">
            Productos sin ventas en los últimos 7 días
          </span>
        </div>
        {recetasSinVenta7.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">✅</div>
            <p>Todos los productos tuvieron al menos una venta.</p>
          </div>
        ) : (
          <>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                marginBottom: 8,
              }}
            >
              Revisá si siguen teniendo sentido en la carta.
            </p>
            <div className="analytics-chips">
              {recetasSinVenta7.slice(0, 10).map((r) => (
                <span key={r.id} className="analytics-chip">
                  {r.emoji || "🍞"} {r.nombre}
                </span>
              ))}
              {recetasSinVenta7.length > 10 && (
                <span
                  className="analytics-chip"
                  style={{ color: "var(--text-muted)" }}
                >
                  +{recetasSinVenta7.length - 10} más
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AnalyticsProductos;

