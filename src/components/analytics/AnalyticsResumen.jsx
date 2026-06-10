/**
 * Vista principal de Analytics: 4 cards (Hoy, Semana, Mes, Año) con plantilla unificada.
 */
import { fmt } from "../../lib/format";

function arrow(dir) {
  if (dir === "up") return "↑";
  if (dir === "down") return "↓";
  return "→";
}

function PeriodCard({
  label,
  ingreso,
  ventasCount,
  gananciaNeta,
  trend,
  trendVsLabel,
  extraLine,
  onVerDetalle,
  tipo,
  /** true = el monto principal también depende del histórico (ej. año) */
  historicoPendiente = false,
  /** true = mostrar monto del período actual; solo comparación/proyección esperan histórico (ej. mes) */
  historicoSoloComparacion = false,
}) {
  const montoPendiente = historicoPendiente && !historicoSoloComparacion;
  const comparacionPendiente = historicoPendiente;

  return (
    <div
      className="stat-card"
      style={{ cursor: "pointer" }}
      onClick={() => onVerDetalle(tipo)}
      onKeyDown={(e) => e.key === "Enter" && onVerDetalle(tipo)}
      role="button"
      tabIndex={0}
    >
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        {montoPendiente ? "…" : fmt(ingreso || 0)}
      </div>
      <div className="analytics-kpi-sub">
        {montoPendiente
          ? "Cargando histórico…"
          : `${ventasCount ?? 0} ventas · Ganancia neta ${fmt(gananciaNeta ?? 0)}`}
      </div>
      <div className="analytics-kpi-sub">
        {comparacionPendiente ? (
          <span style={{ color: "var(--text-muted)" }}>
            {trendVsLabel} · al cargar histórico
          </span>
        ) : (
          <>
            {trendVsLabel}{" "}
            <span
              className={`analytics-trend analytics-trend-${trend?.dir || "flat"}`}
            >
              {arrow(trend?.dir)} {trend?.label || "—"}
            </span>
          </>
        )}
      </div>
      {!comparacionPendiente && extraLine}
    </div>
  );
}

export default function AnalyticsResumen({
  data,
  onVerDetalle,
  cargandoHistorico = false,
}) {
  return (
    <div className="analytics-section">
      <div className="stats-stack">
        <PeriodCard
          label="Hoy"
          ingreso={data.ingresoHoy}
          ventasCount={data.ventasHoy}
          gananciaNeta={data.gananciaHoy}
          trend={data.trendHoyVsAyer}
          trendVsLabel="Vs ayer"
          onVerDetalle={onVerDetalle}
          tipo="hoy"
        />

        <PeriodCard
          label="Semana"
          ingreso={data.ingresoSemanaActual}
          ventasCount={data.ventasSemanaCount}
          gananciaNeta={data.gananciaSemanaActual}
          trend={data.trendIngreso}
          trendVsLabel="Vs sem. anterior"
          onVerDetalle={onVerDetalle}
          tipo="semana"
        />

        <PeriodCard
          label="Mes"
          ingreso={data.ingresoMes}
          ventasCount={data.ventasMesCount}
          gananciaNeta={data.gananciaMesNeta}
          trend={data.trendIngresoMes}
          trendVsLabel="Vs mes anterior"
          onVerDetalle={onVerDetalle}
          tipo="mes"
          historicoPendiente={cargandoHistorico}
          historicoSoloComparacion
          extraLine={
            data.proyeccionAplicable ? (
              <div className="analytics-kpi-sub">
                Proyección ingreso {fmt(data.proyIngresoMes ?? 0)}
              </div>
            ) : null
          }
        />

        <PeriodCard
          label="Año"
          ingreso={data.ingresoAnio}
          ventasCount={data.ventasAnioCount}
          gananciaNeta={data.gananciaAnioNeta}
          trend={data.trendIngresoAnio}
          trendVsLabel="Vs año anterior"
          onVerDetalle={onVerDetalle}
          tipo="anio"
          historicoPendiente={cargandoHistorico}
          extraLine={
            data.proyeccionAnioAplicable ? (
              <div className="analytics-kpi-sub">
                Proyección ingreso {fmt(data.proyIngresoAnio ?? 0)}
              </div>
            ) : null
          }
        />
      </div>
    </div>
  );
}
