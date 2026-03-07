/**
 * Detalle del mes: proyección, pico, cliente, productos sin venta, tops. Con navegación.
 */
import { fmt } from "../../lib/format";
import AnalyticsNavPeriodo from "./AnalyticsNavPeriodo";

export default function AnalyticsDetalleMes({
  data,
  offsetMes,
  onPrev,
  onNext,
  onIrActual,
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
      </div>

      {/* TOP 5 productos más vendidos (mes) */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">TOP 5 productos más vendidos (mes)</span>
        </div>
        {(data.topMasVendidos || []).length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🥐</div>
            <p>No hay ventas este mes.</p>
          </div>
        ) : (
          <div className="analytics-list">
            {(data.topMasVendidos || []).slice(0, 5).map((row) => (
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TOP 5 productos más rentables (30 días) */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">TOP 5 productos más rentables (30 días)</span>
        </div>
        {(data.topMasRentables || []).length === 0 ? (
          <div className="empty">
            <div className="empty-icon">💸</div>
            <p>Todavía no hay datos de ganancia.</p>
          </div>
        ) : (
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
        )}
      </div>

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
