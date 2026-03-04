import { fmt, pctFmt } from "../../lib/format";

function arrow(dir) {
  if (dir === "up") return "↑";
  if (dir === "down") return "↓";
  return "→";
}

function AnalyticsSemana({
  ingresoSemanaActual,
  ingresoSemanaAnterior,
  costoSemanaActual,
  costoSemanaAnterior,
  gananciaSemanaActual,
  gananciaSemanaAnterior,
  margenSemanaActual,
  trendIngreso,
  trendCosto,
  trendGanancia,
  trendMargen,
  topMasVendidos,
  topMasRentables,
  maxIngreso7,
  ultimo7diasFechas,
  ingresoPorDia7,
  diasSemanaCorto,
  totalIngresos7,
  pieGradient,
  pieData,
}) {
  return (
    <div className="analytics-section">
      <div className="card">
        <div className="card-header">
          <span className="card-title">Comparativo semanal</span>
        </div>
        <div className="analytics-kpi-grid">
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">Ingreso</div>
            <div className="analytics-kpi-value">
              {fmt(ingresoSemanaActual)}
              <span
                className={`analytics-trend analytics-trend-${trendIngreso.dir}`}
              >
                {arrow(trendIngreso.dir)} {trendIngreso.label}
              </span>
            </div>
            <div className="analytics-kpi-sub">
              Sem. anterior: {fmt(ingresoSemanaAnterior)}
            </div>
          </div>
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">Costo</div>
            <div className="analytics-kpi-value">
              {fmt(costoSemanaActual)}
              <span
                className={`analytics-trend analytics-trend-${trendCosto.dir}`}
              >
                {arrow(trendCosto.dir)} {trendCosto.label}
              </span>
            </div>
            <div className="analytics-kpi-sub">
              Sem. anterior: {fmt(costoSemanaAnterior)}
            </div>
          </div>
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">Ganancia</div>
            <div className="analytics-kpi-value">
              {fmt(gananciaSemanaActual)}
              <span
                className={`analytics-trend analytics-trend-${trendGanancia.dir}`}
              >
                {arrow(trendGanancia.dir)} {trendGanancia.label}
              </span>
            </div>
            <div className="analytics-kpi-sub">
              Sem. anterior: {fmt(gananciaSemanaAnterior)}
            </div>
          </div>
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">Margen</div>
            <div className="analytics-kpi-value">
              {margenSemanaActual != null
                ? pctFmt(margenSemanaActual)
                : "—"}
              <span
                className={`analytics-trend analytics-trend-${trendMargen.dir}`}
              >
                {arrow(trendMargen.dir)} {trendMargen.label}
              </span>
            </div>
            <div className="analytics-kpi-sub">
              Sobre ingreso semanal
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">
            TOP 5 productos más vendidos (semana)
          </span>
        </div>
        {topMasVendidos.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🥐</div>
            <p>No hay ventas esta semana.</p>
          </div>
        ) : (
          <div className="analytics-list">
            {topMasVendidos.map((row) => (
              <div key={row.receta_id} className="analytics-item">
                <span className="venta-emoji">
                  {row.receta.emoji || "🍞"}
                </span>
                <div className="analytics-item-main">
                  <div className="analytics-item-title">
                    {row.receta.nombre || "Sin nombre"}
                  </div>
                  <div className="analytics-item-sub">
                    {row.unidades} u · {fmt(row.ingreso)}
                  </div>
                </div>
                <span
                  className={`analytics-item-badge analytics-trend-${row.trend.dir}`}
                >
                  {arrow(row.trend.dir)} {row.trend.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">
            TOP 5 productos más rentables (30 días)
          </span>
        </div>
        {topMasRentables.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">💸</div>
            <p>Todavía no hay datos de ganancia.</p>
          </div>
        ) : (
          <div className="analytics-list">
            {topMasRentables.map((row) => (
              <div key={row.receta_id} className="analytics-item">
                <span className="venta-emoji">
                  {row.receta.emoji || "🍞"}
                </span>
                <div className="analytics-item-main">
                  <div className="analytics-item-title">
                    {row.receta.nombre || "Sin nombre"}
                  </div>
                  <div className="analytics-item-sub">
                    Ganancia: {fmt(row.ganancia)} · Ingreso:{" "}
                    {fmt(row.ingreso)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
              {pieData.map((s) => {
                const rec = s.receta || {};
                const color = s.color || "#A98ED2";
                return (
                  <div
                    key={s.receta_id}
                    className="pie-chart-legend-item"
                  >
                    <span
                      className="pie-chart-dot"
                      style={{ backgroundColor: color }}
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
    </div>
  );
}

export default AnalyticsSemana;

