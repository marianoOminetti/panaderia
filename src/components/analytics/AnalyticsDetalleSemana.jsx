/**
 * Detalle de la semana: comparativo, tops, barras L-D, pie. Con navegación de período.
 */
import { fmt, pctFmt } from "../../lib/format";
import AnalyticsNavPeriodo from "./AnalyticsNavPeriodo";

const DIAS_SEMANA = ["L", "M", "X", "J", "V", "S", "D"];

function arrow(dir) {
  if (dir === "up") return "↑";
  if (dir === "down") return "↓";
  return "→";
}

export default function AnalyticsDetalleSemana({
  data,
  offsetSemana,
  onPrev,
  onNext,
  onIrActual,
  onDrill,
  onAbrirVentasPeriodo,
}) {
  const esActual = offsetSemana === 0;

  const ventasSemana = data.ingresoSemanaActual > 0;
  const diaPicoIdx = (data.ingresoPorDiaSemana || []).reduce(
    (bestIdx, val, idx, arr) => (val > arr[bestIdx] ? idx : bestIdx),
    0
  );
  const diasNombres = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const diaPicoSemana = ventasSemana ? diasNombres[diaPicoIdx] : "—";

  return (
    <div className="analytics-section">
      <div className="card">
        <AnalyticsNavPeriodo
          tipo="semana"
          label={data.semanaLabel}
          esActual={esActual}
          onPrev={onPrev}
          onNext={onNext}
          onIrActual={onIrActual}
        />
      </div>

      {/* Comparativo semanal - grid 2x2 */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Comparativo semanal</span>
        </div>
        <div className="analytics-kpi-grid">
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">Ingreso</div>
            <div className="analytics-kpi-value">
              {fmt(data.ingresoSemanaActual ?? 0)}
              <span
                className={`analytics-trend analytics-trend-${data.trendIngreso?.dir || "flat"}`}
              >
                {arrow(data.trendIngreso?.dir)} {data.trendIngreso?.label || "—"}
              </span>
            </div>
            <div className="analytics-kpi-sub">
              Sem. anterior: {fmt(data.ingresoSemanaAnterior ?? 0)}
            </div>
          </div>
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">Costo</div>
            <div className="analytics-kpi-value">
              {fmt(data.costoSemanaActual ?? 0)}
              <span
                className={`analytics-trend analytics-trend-${data.trendCosto?.dir || "flat"}`}
              >
                {arrow(data.trendCosto?.dir)} {data.trendCosto?.label || "—"}
              </span>
            </div>
            <div className="analytics-kpi-sub">
              Sem. anterior: {fmt(data.costoSemanaAnterior ?? 0)}
            </div>
          </div>
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">Ganancia</div>
            <div className="analytics-kpi-value">
              {fmt(data.gananciaSemanaActual ?? 0)}
              <span
                className={`analytics-trend analytics-trend-${data.trendGanancia?.dir || "flat"}`}
              >
                {arrow(data.trendGanancia?.dir)} {data.trendGanancia?.label || "—"}
              </span>
            </div>
            <div className="analytics-kpi-sub">
              Sem. anterior: {fmt(data.gananciaSemanaAnterior ?? 0)}
            </div>
          </div>
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">Margen</div>
            <div className="analytics-kpi-value">
              {data.margenSemanaActual != null
                ? pctFmt(data.margenSemanaActual)
                : "—"}
              <span
                className={`analytics-trend analytics-trend-${data.trendMargen?.dir || "flat"}`}
              >
                {arrow(data.trendMargen?.dir)} {data.trendMargen?.label || "—"}
              </span>
            </div>
            <div className="analytics-kpi-sub">Sobre ingreso semanal</div>
          </div>
        </div>
      </div>

      {/* Pico de ventas y ventas de la semana */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Pico de ventas de la semana</span>
        </div>
        <div className="analytics-kpi-grid">
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">Día con más ventas</div>
            <div className="analytics-kpi-value">{diaPicoSemana}</div>
            <div className="analytics-kpi-sub">
              {ventasSemana
                ? fmt((data.ingresoPorDiaSemana || [])[diaPicoIdx] || 0)
                : "Sin ventas"}
            </div>
          </div>
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">Total ventas</div>
            <div className="analytics-kpi-value">
              {data.totalUnidadesSemana ?? 0}
            </div>
            <div className="analytics-kpi-sub">unidades vendidas</div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 6,
            marginTop: 8,
          }}
        >
          <button
            type="button"
            className="card-link"
            onClick={() => onDrill?.({ tipo: "ingreso-por-dia" })}
          >
            Ver ingreso por día →
          </button>
          <button
            type="button"
            className="card-link"
            onClick={() => onDrill?.({ tipo: "clientes" })}
          >
            Ver clientes del período →
          </button>
        </div>
      </div>

      {/* Ventas por día (L-D) */}
      <button
        type="button"
        className="analytics-drill-card"
        onClick={() => onDrill?.({ tipo: "ingreso-por-dia" })}
        aria-label="Ver ingreso por día de la semana"
      >
        <div className="card-header">
          <span className="card-title">Ventas por día (L–D)</span>
        </div>
        {(data.maxIngresoSemana || 0) === 0 ? (
          <div className="empty">
            <div className="empty-icon">📊</div>
            <p>No hay ventas esta semana.</p>
          </div>
        ) : (
          <>
            <div className="bar-chart bar-chart-7">
              {(data.ingresoPorDiaSemana || []).map((total, idx) => {
                const maxH = 70;
                const h = (data.maxIngresoSemana || 0) > 0
                  ? Math.max((total / data.maxIngresoSemana) * maxH, 6)
                  : 6;
                const label = DIAS_SEMANA[idx] || "";
                return (
                  <div key={idx} className="bar-chart-col">
                    <div className="bar-chart-value">
                      {total > 0 ? (total >= 1000 ? Math.round(total / 1000) + "k" : Math.round(total)) : ""}
                    </div>
                    <div
                      className="bar-chart-bar"
                      style={{ height: `${h}px` }}
                    />
                    <div className="bar-chart-label">{label}</div>
                  </div>
                );
              })}
            </div>
            <span className="analytics-drill-hint">Ver tabla de ingresos por día</span>
          </>
        )}
      </button>

      {/* TOP 5 productos más vendidos */}
      <button
        type="button"
        className="analytics-drill-card"
        onClick={() => onDrill?.({ tipo: "productos-vendidos" })}
        aria-label="Ver todos los productos vendidos en la semana"
      >
        <div className="card-header">
          <span className="card-title">TOP 5 productos más vendidos (semana)</span>
        </div>
        {(data.topMasVendidos || []).length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🥐</div>
            <p>No hay ventas esta semana.</p>
          </div>
        ) : (
          <>
            <div className="analytics-list">
              {(data.topMasVendidos || []).map((row) => (
                <div key={row.receta_id} className="analytics-item">
                  <span className="venta-emoji">{row.receta?.emoji || "🍞"}</span>
                  <div className="analytics-item-main">
                    <div className="analytics-item-title">
                      {row.receta?.nombre || "Sin nombre"}
                    </div>
                    <div className="analytics-item-sub">
                      {row.unidades} u · {fmt(row.ingreso)}
                    </div>
                  </div>
                  {row.trend && (
                    <span
                      className={`analytics-item-badge analytics-trend-${row.trend.dir}`}
                    >
                      {arrow(row.trend.dir)} {row.trend.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <span className="analytics-drill-hint">Ver todos los productos</span>
          </>
        )}
      </button>

      {/* TOP 5 productos más rentables (misma semana que el encabezado) */}
      <button
        type="button"
        className="analytics-drill-card"
        onClick={() => onDrill?.({ tipo: "productos-rentables" })}
        aria-label="Ver rentabilidad de todos los productos en la semana"
      >
        <div className="card-header">
          <span className="card-title">TOP 5 productos más rentables (semana)</span>
        </div>
        {(data.topMasRentables || []).length === 0 ? (
          <div className="empty">
            <div className="empty-icon">💸</div>
            <p>Todavía no hay datos de ganancia esta semana.</p>
          </div>
        ) : (
          <>
            <div className="analytics-list">
              {(data.topMasRentables || []).map((row) => (
                <div key={row.receta_id} className="analytics-item">
                  <span className="venta-emoji">{row.receta?.emoji || "🍞"}</span>
                  <div className="analytics-item-main">
                    <div className="analytics-item-title">
                      {row.receta?.nombre || "Sin nombre"}
                    </div>
                    <div className="analytics-item-sub">
                      Ganancia: {fmt(row.ganancia)} · Ingreso: {fmt(row.ingreso)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <span className="analytics-drill-hint">Ver rentabilidad completa</span>
          </>
        )}
      </button>

      <button
        type="button"
        className="analytics-drill-card"
        onClick={() => onDrill?.({ tipo: "ventas" })}
        aria-label="Ver ventas agrupadas de la semana"
      >
        <div className="card-header">
          <span className="card-title">Ventas agrupadas</span>
        </div>
        <span
          style={{
            display: "block",
            fontSize: 14,
            color: "var(--text-muted)",
            margin: "0 0 4px",
            lineHeight: 1.4,
          }}
        >
          Tickets y totales de la semana seleccionada (misma fecha que arriba).
        </span>
        <span className="analytics-drill-hint">Abrir listado</span>
      </button>

      {onAbrirVentasPeriodo &&
        data.periodoSemanaDesdeStr &&
        data.periodoSemanaHastaStr && (
          <div className="card" style={{ paddingTop: 10, paddingBottom: 10 }}>
            <button
              type="button"
              className="card-link"
              onClick={() =>
                onAbrirVentasPeriodo({
                  desde: data.periodoSemanaDesdeStr,
                  hasta: data.periodoSemanaHastaStr,
                  label: `Semana · ${data.semanaLabel || ""}`,
                })
              }
            >
              Abrir pestaña Ventas con estas mismas fechas →
            </button>
          </div>
        )}

      {/* Distribución de productos (pie chart) */}
      {(data.totalIngresosSemana || 0) > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Distribución de productos</span>
          </div>
          <div className="pie-chart">
            <div
              className="pie-chart-figure"
              style={{
                background: data.pieGradientSemana
                  ? `conic-gradient(${data.pieGradientSemana})`
                  : "conic-gradient(#A98ED2 0deg 360deg)",
              }}
            />
            <div className="pie-chart-legend">
              {(data.pieDataWithColorSemana || []).map((s) => {
                const rec = s.receta || {};
                const color = s.color || "#A98ED2";
                return (
                  <div key={s.receta_id} className="pie-chart-legend-item">
                    <span
                      className="pie-chart-dot"
                      style={{ backgroundColor: color }}
                    />
                    <span className="pie-chart-label">{rec.nombre}</span>
                    <span className="pie-chart-pct">{pctFmt(s.pct)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
