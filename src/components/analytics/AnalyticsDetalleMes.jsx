/**
 * Detalle del mes: proyección, pico, cliente, productos sin venta, tops. Con navegación.
 */
import { fmt } from "../../lib/format";
import AnalyticsNavPeriodo from "./AnalyticsNavPeriodo";

function arrow(dir) {
  if (dir === "up") return "↑";
  if (dir === "down") return "↓";
  return "→";
}

export default function AnalyticsDetalleMes({
  data,
  offsetMes,
  onPrev,
  onNext,
  onIrActual,
  onDrill,
  onAbrirVentasPeriodo,
}) {
  const esActual = offsetMes === 0;
  const recetasSinVenta =
    offsetMes === 0
      ? (data.recetasSinVenta7 || [])
      : (data.recetasSinVentaMes || []);

  return (
    <div className="analytics-section">
      <div className="card">
        <AnalyticsNavPeriodo
          tipo="mes"
          label={data.mesLabel}
          esActual={esActual}
          onPrev={onPrev}
          onNext={onNext}
          onIrActual={onIrActual}
        />
      </div>

      {/* Proyección del mes - grid 2x2 */}
      {data.proyeccionAplicable && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Proyección del mes</span>
          </div>
          <div className="analytics-kpi-grid">
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-label">Ingreso proyectado</div>
              <div className="analytics-kpi-value">
                {fmt(data.proyIngresoMes || 0)}
              </div>
              <div className="analytics-kpi-sub">
                Acumulado: {fmt(data.ingresoMes ?? 0)} en {data.diasTranscurridos} {data.diasTranscurridos === 1 ? "día" : "días"}
              </div>
            </div>
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-label">Ganancia proyectada</div>
              <div className="analytics-kpi-value">
                {fmt(data.proyGananciaMesNeta || 0)}
              </div>
              <div className="analytics-kpi-sub">
                Acumulado: {fmt(data.gananciaMesNeta ?? 0)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mes cerrado: mismo KPI que antes estaba solo como "acumulado" bajo proyección */}
      {!data.proyeccionAplicable && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Resultado del mes</span>
          </div>
          <div className="analytics-kpi-grid">
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-label">Ingreso</div>
              <div className="analytics-kpi-value">
                {fmt(data.ingresoMes ?? 0)}
              </div>
            </div>
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-label">Costo</div>
              <div className="analytics-kpi-value">
                {fmt(data.costoMes ?? 0)}
              </div>
            </div>
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-label">Ganancia neta</div>
              <div className="analytics-kpi-value">
                {fmt(data.gananciaMesNeta ?? 0)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pico de ventas y cliente del mes - grid 2x2 */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Pico de ventas y cliente del mes</span>
        </div>
        <div className="analytics-kpi-grid">
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">Semana con más ventas</div>
            <div className="analytics-kpi-value">{data.semanaPicoLabel || "—"}</div>
            <div className="analytics-kpi-sub">
              Día pico: {data.diaPicoLabel || "—"} {data.horaPicoLabel || ""}
            </div>
          </div>
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">Cliente que más compró</div>
            <div className="analytics-kpi-value">
              {data.mejorCliente ? data.mejorCliente.nombre : "—"}
            </div>
            <div className="analytics-kpi-sub">
              {data.mejorCliente
                ? `Total: ${fmt(data.mejorClienteTotal)}`
                : "Sin compras este mes"}
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
            onClick={() => onDrill?.({ tipo: "ingreso-dia-mes" })}
          >
            Ver ingreso por día de la semana (en el mes) →
          </button>
          <button
            type="button"
            className="card-link"
            onClick={() => onDrill?.({ tipo: "clientes" })}
          >
            Ver todos los clientes del mes →
          </button>
        </div>
      </div>

      {/* TOP 5 productos más vendidos (mes) */}
      <button
        type="button"
        className="analytics-drill-card"
        onClick={() => onDrill?.({ tipo: "productos-vendidos" })}
        aria-label="Ver todos los productos vendidos en el mes"
      >
        <div className="card-header">
          <span className="card-title">TOP 5 productos más vendidos (mes)</span>
        </div>
        {(data.topMasVendidosMes || []).length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🥐</div>
            <p>No hay ventas este mes.</p>
          </div>
        ) : (
          <>
            <div className="analytics-list">
              {(data.topMasVendidosMes || []).map((row) => (
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

      {/* TOP 5 productos más rentables (mes) */}
      <button
        type="button"
        className="analytics-drill-card"
        onClick={() => onDrill?.({ tipo: "productos-rentables" })}
        aria-label="Ver rentabilidad de todos los productos en el mes"
      >
        <div className="card-header">
          <span className="card-title">TOP 5 productos más rentables (mes)</span>
        </div>
        {(data.topMasRentablesMes || []).length === 0 ? (
          <div className="empty">
            <div className="empty-icon">💸</div>
            <p>Todavía no hay datos de ganancia este mes.</p>
          </div>
        ) : (
          <>
            <div className="analytics-list">
              {(data.topMasRentablesMes || []).map((row) => (
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
        aria-label="Ver ventas agrupadas del mes"
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
          Tickets y totales del mes seleccionado.
        </span>
        <span className="analytics-drill-hint">Abrir listado</span>
      </button>

      {onAbrirVentasPeriodo &&
        data.periodoMesDesdeStr &&
        data.periodoMesHastaStr && (
          <div className="card" style={{ paddingTop: 10, paddingBottom: 10 }}>
            <button
              type="button"
              className="card-link"
              onClick={() =>
                onAbrirVentasPeriodo({
                  desde: data.periodoMesDesdeStr,
                  hasta: data.periodoMesHastaStr,
                  label: `Mes · ${data.mesLabel || ""}`,
                })
              }
            >
              Abrir pestaña Ventas con estas mismas fechas →
            </button>
          </div>
        )}

      {/* Productos sin ventas */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            {offsetMes === 0
              ? "Productos sin ventas (últimos 7 días)"
              : "Productos sin ventas (mes)"}
          </span>
        </div>
        {recetasSinVenta.length === 0 ? (
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
              {recetasSinVenta.slice(0, 10).map((r) => (
                <span key={r.id} className="analytics-chip">
                  {r.emoji || "🍞"} {r.nombre}
                </span>
              ))}
              {recetasSinVenta.length > 10 && (
                <span
                  className="analytics-chip"
                  style={{ color: "var(--text-muted)" }}
                >
                  +{recetasSinVenta.length - 10} más
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
