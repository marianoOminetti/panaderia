/**
 * Detalle del día: ventas por hora, ranking productos, clientes del día.
 * Navegación ← → para ir a ayer, anteayer, etc.
 */
import { useState, useMemo, useEffect } from "react";
import { fmt, pctFmt } from "../../lib/format";
import AnalyticsNavPeriodo from "./AnalyticsNavPeriodo";
import Pagination from "../ui/Pagination";

const PAGE_SIZE = 10;

function arrow(dir) {
  if (dir === "up") return "↑";
  if (dir === "down") return "↓";
  return "→";
}

export default function AnalyticsDetalleHoy({
  data,
  offsetDia,
  onPrev,
  onNext,
  onIrActual,
}) {
  const esActual = offsetDia >= 0;
  const [pageClientes, setPageClientes] = useState(1);

  // Agrupar ventas en 4 franjas: Mañana (6-11), Mediodía (12-14), Tarde (15-19), Noche (20-5)
  const franjas = useMemo(() => {
    const horas = data.ingresoPorHoraHoy || [];
    const sumar = (desde, hasta) =>
      horas.slice(desde, hasta + 1).reduce((s, v) => s + (v || 0), 0);
    return [
      { label: "Mañana", rango: "6 a 12h", total: sumar(6, 11) },
      { label: "Mediodía", rango: "12 a 15h", total: sumar(12, 14) },
      { label: "Tarde", rango: "15 a 20h", total: sumar(15, 19) },
      { label: "Noche", rango: "20 a 6h", total: sumar(20, 23) + sumar(0, 5) },
    ];
  }, [data.ingresoPorHoraHoy]);

  const maxFranja = franjas.reduce((m, f) => (f.total > m ? f.total : m), 0) || 1;
  const hayVentas = franjas.some((f) => f.total > 0);
  const franjaPico = franjas.reduce(
    (best, f) => (f.total > best.total ? f : best),
    franjas[0]
  );

  const clientesDelDia = useMemo(
    () => data.clientesDelDia || [],
    [data.clientesDelDia]
  );
  const totalPagesClientes = Math.max(
    1,
    Math.ceil(clientesDelDia.length / PAGE_SIZE)
  );
  const clientesPaginados = useMemo(() => {
    const start = (pageClientes - 1) * PAGE_SIZE;
    return clientesDelDia.slice(start, start + PAGE_SIZE);
  }, [clientesDelDia, pageClientes]);

  const productosConVenta = (data.topProductosHoy || []).filter(
    (r) => (r.unidades || 0) > 0
  );

  useEffect(() => {
    if (pageClientes > totalPagesClientes) {
      setPageClientes(1);
    }
  }, [pageClientes, totalPagesClientes]);

  return (
    <div className="analytics-section">
      <div className="card">
        <AnalyticsNavPeriodo
          tipo="día"
          label={data.diaLabel || "Hoy"}
          esActual={esActual}
          onPrev={onPrev}
          onNext={onNext}
          onIrActual={onIrActual}
        />
      </div>

      {/* Comparativo diario - grid 2x2 */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Comparativo diario</span>
        </div>
        <div className="analytics-kpi-grid">
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">Ingreso</div>
            <div className="analytics-kpi-value">
              {fmt(data.ingresoHoy || 0)}
              <span
                className={`analytics-trend analytics-trend-${data.trendHoyVsAyer?.dir || "flat"}`}
              >
                {arrow(data.trendHoyVsAyer?.dir)} {data.trendHoyVsAyer?.label || "—"}
              </span>
            </div>
            <div className="analytics-kpi-sub">
              Día anterior: {fmt(data.ingresoAyer ?? 0)}
            </div>
          </div>
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">Costo</div>
            <div className="analytics-kpi-value">{fmt(data.costoHoy || 0)}</div>
            <div className="analytics-kpi-sub">
              Día anterior: {fmt(data.costoAyer ?? 0)}
            </div>
          </div>
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">Ganancia</div>
            <div className="analytics-kpi-value">{fmt(data.gananciaHoy || 0)}</div>
            <div className="analytics-kpi-sub">
              Día anterior: {fmt(data.gananciaAyer ?? 0)}
            </div>
          </div>
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">Margen</div>
            <div className="analytics-kpi-value">
              {data.margenHoy != null ? pctFmt(data.margenHoy) : "—"}
            </div>
            <div className="analytics-kpi-sub">
              Día anterior: {data.margenAyer != null ? pctFmt(data.margenAyer) : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Pico de ventas y clientes del día */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Pico de ventas y clientes del día</span>
        </div>
        <div className="analytics-kpi-grid">
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">Franja con más ventas</div>
            <div className="analytics-kpi-value">
              {hayVentas ? franjaPico.label : "—"}
            </div>
            <div className="analytics-kpi-sub">
              {hayVentas ? `Horario: ${franjaPico.rango}` : "Sin ventas"}
            </div>
          </div>
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">Clientes del día</div>
            <div className="analytics-kpi-value">{clientesDelDia.length}</div>
            <div className="analytics-kpi-sub">
              {data.ventasHoy || 0} ventas realizadas
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Ventas por franja horaria</span>
        </div>
        {!hayVentas ? (
          <div className="empty">
            <div className="empty-icon">📊</div>
            <p>No hay ventas en este día.</p>
          </div>
        ) : (
          <div className="bar-chart bar-chart-franjas">
            {franjas.map((f) => {
              const pct = (f.total / maxFranja) * 100;
              return (
                <div key={f.label} className="bar-chart-col">
                  <div className="bar-chart-value">
                    {f.total > 0 ? fmt(f.total) : ""}
                  </div>
                  <div
                    className="bar-chart-bar"
                    style={{ height: `${Math.max(pct, 4)}%` }}
                  />
                  <div className="bar-chart-label">{f.label}</div>
                  <div className="bar-chart-sublabel">{f.rango}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {productosConVenta.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Productos vendidos del día</span>
          </div>
          <div className="analytics-list">
            {productosConVenta.map((row) => (
              <div key={row.receta_id} className="analytics-item">
                <span
                  className="analytics-item-badge"
                  style={{
                    minWidth: 24,
                    textAlign: "center",
                    fontWeight: 600,
                  }}
                >
                  #{row.rank}
                </span>
                <span className="venta-emoji">
                  {row.receta?.emoji || "🍞"}
                </span>
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
        </div>
      )}

      {(data.topRentablesHoy || []).length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Top 5 más rentables</span>
          </div>
          <div className="analytics-list">
            {(data.topRentablesHoy || []).map((row) => (
              <div key={row.receta_id} className="analytics-item">
                <span
                  className="analytics-item-badge"
                  style={{
                    minWidth: 24,
                    textAlign: "center",
                    fontWeight: 600,
                  }}
                >
                  #{row.rank}
                </span>
                <span className="venta-emoji">
                  {row.receta?.emoji || "🍞"}
                </span>
                <div className="analytics-item-main">
                  <div className="analytics-item-title">
                    {row.receta?.nombre || "Sin nombre"}
                  </div>
                  <div className="analytics-item-sub">
                    {fmt(row.ganancia)} ganancia · {pctFmt(row.margen)} margen
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">Clientes del día</span>
        </div>
        {clientesDelDia.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">👥</div>
            <p>No hay ventas en este día.</p>
          </div>
        ) : (
          <>
            <div className="analytics-list">
              {clientesPaginados.map((c) => (
                <div key={c.cliente_id} className="analytics-item">
                  <div className="analytics-item-main">
                    <div className="analytics-item-title">
                      {c.cliente?.nombre || "—"}
                    </div>
                  </div>
                  <span
                    className="stat-value"
                    style={{ fontSize: 15, color: "var(--green)" }}
                  >
                    {fmt(c.total)}
                  </span>
                </div>
              ))}
            </div>
            <Pagination
              page={pageClientes}
              totalPages={totalPagesClientes}
              onPrev={() => setPageClientes((p) => Math.max(1, p - 1))}
              onNext={() =>
                setPageClientes((p) => Math.min(totalPagesClientes, p + 1))
              }
            />
          </>
        )}
      </div>
    </div>
  );
}
