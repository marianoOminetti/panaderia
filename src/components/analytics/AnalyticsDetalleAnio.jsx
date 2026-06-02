/**
 * Detalle del año calendario: KPIs, ingreso por mes, tops y drill.
 */
import { fmt, pctFmt } from "../../lib/format";
import AnalyticsNavPeriodo from "./AnalyticsNavPeriodo";

function arrow(dir) {
  if (dir === "up") return "↑";
  if (dir === "down") return "↓";
  return "→";
}

export default function AnalyticsDetalleAnio({
  data,
  offsetAnio,
  onPrev,
  onNext,
  onIrActual,
  onDrill,
  onAbrirVentasPeriodo,
}) {
  const esActual = offsetAnio === 0;

  return (
    <div className="analytics-section">
      <div className="card">
        <AnalyticsNavPeriodo
          tipo="año"
          label={data.anioLabel}
          esActual={esActual}
          onPrev={onPrev}
          onNext={onNext}
          onIrActual={onIrActual}
        />
      </div>

      {data.proyeccionAnioAplicable && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Proyección del año</span>
          </div>
          <div className="analytics-kpi-grid">
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-label">Ingreso proyectado</div>
              <div className="analytics-kpi-value">
                {fmt(data.proyIngresoAnio || 0)}
              </div>
              <div className="analytics-kpi-sub">
                Acumulado: {fmt(data.ingresoAnio ?? 0)} en{" "}
                {data.diasTranscurridosAnio}{" "}
                {data.diasTranscurridosAnio === 1 ? "día" : "días"}
              </div>
            </div>
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-label">Ganancia proyectada</div>
              <div className="analytics-kpi-value">
                {fmt(data.proyGananciaAnioNeta || 0)}
              </div>
              <div className="analytics-kpi-sub">
                Acumulado: {fmt(data.gananciaAnioNeta ?? 0)}
              </div>
            </div>
          </div>
        </div>
      )}

      {!data.proyeccionAnioAplicable && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Resultado del año</span>
          </div>
          <div className="analytics-kpi-grid">
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-label">Ingreso</div>
              <div className="analytics-kpi-value">
                {fmt(data.ingresoAnio ?? 0)}
              </div>
            </div>
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-label">Costo</div>
              <div className="analytics-kpi-value">
                {fmt(data.costoAnio ?? 0)}
              </div>
            </div>
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-label">Ganancia neta</div>
              <div className="analytics-kpi-value">
                {fmt(data.gananciaAnioNeta ?? 0)}
              </div>
            </div>
          </div>
        </div>
      )}

      {!data.proyeccionAnioAplicable && (
      <div className="card">
        <div className="card-header">
          <span className="card-title">Comparativo anual</span>
        </div>
        <div className="analytics-kpi-grid">
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">Ingreso</div>
            <div className="analytics-kpi-value">
              {fmt(data.ingresoAnio ?? 0)}
              <span
                className={`analytics-trend analytics-trend-${data.trendIngresoAnio?.dir || "flat"}`}
              >
                {arrow(data.trendIngresoAnio?.dir)}{" "}
                {data.trendIngresoAnio?.label || "—"}
              </span>
            </div>
            <div className="analytics-kpi-sub">
              Año anterior: {fmt(data.ingresoAnioAnterior ?? 0)}
            </div>
          </div>
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">Costo</div>
            <div className="analytics-kpi-value">
              {fmt(data.costoAnio ?? 0)}
              <span
                className={`analytics-trend analytics-trend-${data.trendCostoAnio?.dir || "flat"}`}
              >
                {arrow(data.trendCostoAnio?.dir)}{" "}
                {data.trendCostoAnio?.label || "—"}
              </span>
            </div>
            <div className="analytics-kpi-sub">
              Año anterior: {fmt(data.costoAnioAnterior ?? 0)}
            </div>
          </div>
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">Ganancia</div>
            <div className="analytics-kpi-value">
              {fmt(data.gananciaAnioNeta ?? 0)}
              <span
                className={`analytics-trend analytics-trend-${data.trendGananciaAnio?.dir || "flat"}`}
              >
                {arrow(data.trendGananciaAnio?.dir)}{" "}
                {data.trendGananciaAnio?.label || "—"}
              </span>
            </div>
            <div className="analytics-kpi-sub">
              Año anterior: {fmt(data.gananciaAnioNetaAnterior ?? 0)}
            </div>
          </div>
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">Margen</div>
            <div className="analytics-kpi-value">
              {data.margenAnioActual != null
                ? pctFmt(data.margenAnioActual)
                : "—"}
              <span
                className={`analytics-trend analytics-trend-${data.trendMargenAnio?.dir || "flat"}`}
              >
                {arrow(data.trendMargenAnio?.dir)}{" "}
                {data.trendMargenAnio?.label || "—"}
              </span>
            </div>
            <div className="analytics-kpi-sub">Sobre ingreso anual (bruto)</div>
          </div>
        </div>
      </div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">Pico del año</span>
        </div>
        <div className="analytics-kpi-grid">
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">Mes con más ventas</div>
            <div className="analytics-kpi-value">{data.mesPicoAnioLabel || "—"}</div>
          </div>
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">Cliente que más compró</div>
            <div className="analytics-kpi-value">
              {data.mejorClienteAnio ? data.mejorClienteAnio.nombre : "—"}
            </div>
            <div className="analytics-kpi-sub">
              {data.mejorClienteAnio
                ? `Total: ${fmt(data.mejorClienteAnioTotal)}`
                : "Sin compras este año"}
            </div>
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
            onClick={() => onDrill?.({ tipo: "clientes" })}
          >
            Ver todos los clientes del año →
          </button>
        </div>
      </div>

      <button
        type="button"
        className="analytics-drill-card"
        onClick={() => onDrill?.({ tipo: "ingreso-por-mes-anio" })}
        aria-label="Ver ingreso por mes del año"
      >
        <div className="card-header">
          <span className="card-title">Ingreso por mes</span>
        </div>
        {(data.maxIngresoMesAnio || 0) === 0 ? (
          <div className="empty">
            <div className="empty-icon">📊</div>
            <p>No hay ventas este año.</p>
          </div>
        ) : (
          <>
            <div className="bar-chart bar-chart-12">
              {(data.ingresoPorMesAnio || []).map((row, idx) => {
                const maxH = 70;
                const h =
                  (data.maxIngresoMesAnio || 0) > 0
                    ? Math.max(
                        (row.ingreso / data.maxIngresoMesAnio) * maxH,
                        4
                      )
                    : 4;
                return (
                  <div key={idx} className="bar-chart-col">
                    <div className="bar-chart-value">
                      {row.ingreso > 0
                        ? row.ingreso >= 1000
                          ? Math.round(row.ingreso / 1000) + "k"
                          : Math.round(row.ingreso)
                        : ""}
                    </div>
                    <div
                      className="bar-chart-bar"
                      style={{ height: `${h}px` }}
                    />
                    <div className="bar-chart-label">{row.label}</div>
                  </div>
                );
              })}
            </div>
            <span className="analytics-drill-hint">Ver tabla de ingresos por mes</span>
          </>
        )}
      </button>

      <button
        type="button"
        className="analytics-drill-card"
        onClick={() => onDrill?.({ tipo: "productos-vendidos" })}
        aria-label="Ver todos los productos vendidos en el año"
      >
        <div className="card-header">
          <span className="card-title">TOP 5 productos más vendidos (año)</span>
        </div>
        {(data.topMasVendidosAnio || []).length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🥐</div>
            <p>No hay ventas este año.</p>
          </div>
        ) : (
          <>
            <div className="analytics-list">
              {(data.topMasVendidosAnio || []).map((row) => (
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

      <button
        type="button"
        className="analytics-drill-card"
        onClick={() => onDrill?.({ tipo: "productos-rentables" })}
        aria-label="Ver rentabilidad de todos los productos en el año"
      >
        <div className="card-header">
          <span className="card-title">TOP 5 productos más rentables (año)</span>
        </div>
        {(data.topMasRentablesAnio || []).length === 0 ? (
          <div className="empty">
            <div className="empty-icon">💸</div>
            <p>Todavía no hay datos de ganancia este año.</p>
          </div>
        ) : (
          <>
            <div className="analytics-list">
              {(data.topMasRentablesAnio || []).map((row) => (
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
        aria-label="Ver ventas agrupadas del año"
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
          Tickets y totales del año seleccionado.
        </span>
        <span className="analytics-drill-hint">Abrir listado</span>
      </button>

      {onAbrirVentasPeriodo &&
        data.periodoAnioDesdeStr &&
        data.periodoAnioHastaStr && (
          <div className="card" style={{ paddingTop: 10, paddingBottom: 10 }}>
            <button
              type="button"
              className="card-link"
              onClick={() =>
                onAbrirVentasPeriodo({
                  desde: data.periodoAnioDesdeStr,
                  hasta: data.periodoAnioHastaStr,
                  label: `Año · ${data.anioLabel || ""}`,
                })
              }
            >
              Abrir pestaña Ventas con estas mismas fechas →
            </button>
          </div>
        )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">Productos sin ventas (año)</span>
        </div>
        {(data.recetasSinVentaAnio || []).length === 0 ? (
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
              {(data.recetasSinVentaAnio || []).slice(0, 10).map((r) => (
                <span key={r.id} className="analytics-chip">
                  {r.emoji || "🍞"} {r.nombre}
                </span>
              ))}
              {(data.recetasSinVentaAnio || []).length > 10 && (
                <span
                  className="analytics-chip"
                  style={{ color: "var(--text-muted)" }}
                >
                  +{data.recetasSinVentaAnio.length - 10} más
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
