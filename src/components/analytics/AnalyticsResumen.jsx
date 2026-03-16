/**
 * Vista principal de Analytics: 3 cards (Hoy, Semana, Mes) con "Ver detalle"
 */
import { fmt } from "../../lib/format";

function arrow(dir) {
  if (dir === "up") return "↑";
  if (dir === "down") return "↓";
  return "→";
}

export default function AnalyticsResumen({ data, onVerDetalle }) {
  return (
    <div className="analytics-section">
      <div className="stats-stack">
        <div
          className="stat-card"
          style={{ cursor: "pointer" }}
          onClick={() => onVerDetalle("hoy")}
          onKeyDown={(e) => e.key === "Enter" && onVerDetalle("hoy")}
          role="button"
          tabIndex={0}
        >
          <div className="stat-label">Hoy</div>
          <div className="stat-value">{fmt(data.ingresoHoy || 0)}</div>
          <div className="analytics-kpi-sub">
            {data.ventasHoy || 0} ventas · Ganancia {fmt(data.gananciaHoy ?? 0)}
          </div>
          <div className="analytics-kpi-sub">
            Vs ayer{" "}
            <span
              className={`analytics-trend analytics-trend-${data.trendHoyVsAyer?.dir || "flat"}`}
            >
              {arrow(data.trendHoyVsAyer?.dir)} {data.trendHoyVsAyer?.label || "—"}
            </span>
          </div>
        </div>

        <div
          className="stat-card"
          style={{ cursor: "pointer" }}
          onClick={() => onVerDetalle("semana")}
          onKeyDown={(e) => e.key === "Enter" && onVerDetalle("semana")}
          role="button"
          tabIndex={0}
        >
          <div className="stat-label">Semana</div>
          <div className="stat-value">{fmt(data.ingresoSemanaActual || 0)}</div>
          <div className="analytics-kpi-sub">
            Ganancia {fmt(data.gananciaSemanaActual ?? 0)} · Margen{" "}
            {data.margenSemanaActual != null
              ? `${Math.round(data.margenSemanaActual * 100)}%`
              : "—"}
          </div>
          <div className="analytics-kpi-sub">
            Vs sem. anterior{" "}
            <span
              className={`analytics-trend analytics-trend-${data.trendGanancia?.dir || "flat"}`}
            >
              {arrow(data.trendGanancia?.dir)} {data.trendGanancia?.label || "—"}
            </span>
          </div>
        </div>

        <div
          className="stat-card"
          style={{ cursor: "pointer" }}
          onClick={() => onVerDetalle("mes")}
          onKeyDown={(e) => e.key === "Enter" && onVerDetalle("mes")}
          role="button"
          tabIndex={0}
        >
          <div className="stat-label">Mes</div>
          <div className="stat-value">{fmt(data.ingresoMes || 0)}</div>
          <div className="analytics-kpi-sub">
            Ganancia neta {fmt(data.gananciaMesNeta ?? 0)}
          </div>
          {data.proyeccionAplicable && (
            <div className="analytics-kpi-sub">
              Proyección ingreso {fmt(data.proyIngresoMes ?? 0)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
