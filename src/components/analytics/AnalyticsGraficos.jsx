import { CATEGORIAS, CAT_COLORS } from "../../config/appConfig";
import { fmt, pctFmt } from "../../lib/format";

function AnalyticsGraficos({
  ultimo7diasFechas,
  ingresoPorDia7,
  maxIngreso7,
  diasSemanaCorto,
  pieData,
  totalIngresos7,
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
  const enrichedPieData = pieData.map((s, idx) => {
    const rec = s.receta || {};
    const color =
      CATEGORIAS.includes(rec.categoria) &&
      CAT_COLORS[rec.categoria]
        ? CAT_COLORS[rec.categoria]
        : ["#A98ED2", "#4A7C59", "#D64545", "#D4A843", "#8B6040"][
            idx % 5
          ];
    return { ...s, color };
  });

  const pieGradient = (() => {
    let acum = 0;
    return enrichedPieData
      .map((s) => {
        const start = acum * 360;
        const end = (acum + s.pct) * 360;
        acum += s.pct;
        return `${s.color} ${start}deg ${end}deg`;
      })
      .join(", ");
  })();

  return (
    <div className="analytics-section">
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            Ventas por día (últimos 7 días)
          </span>
        </div>
        {maxIngreso7 === 0 ? (
          <div className="empty">
            <div className="empty-icon">📊</div>
            <p>No hay ventas en los últimos 7 días.</p>
          </div>
        ) : (
          <div className="bar-chart">
            {ultimo7diasFechas.map((d, idx) => {
              const total = ingresoPorDia7[idx];
              const pct =
                maxIngreso7 > 0 ? (total / maxIngreso7) * 100 : 0;
              const label = diasSemanaCorto[d.getDay()] || "";
              return (
                <div key={idx} className="bar-chart-col">
                  <div className="bar-chart-value">
                    {total > 0
                      ? Math.round(total / 1000) + "k"
                      : ""}
                  </div>
                  <div
                    className="bar-chart-bar"
                    style={{ height: `${Math.max(pct, 8)}%` }}
                  />
                  <div className="bar-chart-label">{label}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">
            Distribución de productos (últimos 7 días)
          </span>
        </div>
        {totalIngresos7 === 0 ? (
          <div className="empty">
            <div className="empty-icon">🥧</div>
            <p>No hay ventas en los últimos 7 días.</p>
          </div>
        ) : (
          <div className="pie-chart">
            <div
              className="pie-chart-figure"
              style={{
                background:
                  pieGradient || "conic-gradient(#A98ED2 0deg 360deg)",
              }}
            />
            <div className="pie-chart-legend">
              {enrichedPieData.map((s) => {
                const rec = s.receta || {};
                return (
                  <div
                    key={s.receta_id}
                    className="pie-chart-legend-item"
                  >
                    <span
                      className="pie-chart-dot"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="pie-chart-label">
                      {rec.nombre}
                    </span>
                    <span className="pie-chart-pct">
                      {pctFmt(s.pct)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

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

export default AnalyticsGraficos;

