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
  costoMateriaPrima,
  gastosNegocio,
  trend,
  trendVsLabel,
  extraLine,
  onVerDetalle,
  tipo,
  historicoPendiente = false,
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
          : `${ventasCount ?? 0} ventas · Neta ${fmt(gananciaNeta ?? 0)} · MP ${fmt(costoMateriaPrima ?? 0)} · Gastos ${fmt(gastosNegocio ?? 0)}`}
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
          costoMateriaPrima={data.economiaHoy?.costoMateriaPrima}
          gastosNegocio={data.economiaHoy?.gastosNegocio}
          trend={data.trendGananciaNeta}
          trendVsLabel="Vs ayer"
          onVerDetalle={onVerDetalle}
          tipo="hoy"
        />

        <PeriodCard
          label="Semana"
          ingreso={data.ingresoSemanaActual}
          ventasCount={data.ventasSemanaCount}
          gananciaNeta={data.gananciaSemanaActual}
          costoMateriaPrima={data.economiaSemanaActual?.costoMateriaPrima}
          gastosNegocio={data.economiaSemanaActual?.gastosNegocio}
          trend={data.trendGanancia}
          trendVsLabel="Vs sem. anterior"
          onVerDetalle={onVerDetalle}
          tipo="semana"
        />

        <PeriodCard
          label="Mes"
          ingreso={data.ingresoMes}
          ventasCount={data.ventasMesCount}
          gananciaNeta={data.gananciaMesNeta}
          costoMateriaPrima={data.economiaMes?.costoMateriaPrima}
          gastosNegocio={data.economiaMes?.gastosNegocio}
          trend={data.trendGananciaMes}
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
          costoMateriaPrima={data.economiaAnio?.costoMateriaPrima}
          gastosNegocio={data.economiaAnio?.gastosNegocio}
          trend={data.trendGananciaAnio}
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
