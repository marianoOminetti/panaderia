/**
 * Desglose económico unificado: ingresos, MP, gastos del negocio y ganancia neta.
 */
import { fmt, pctFmt } from "../../lib/format";

function arrow(dir) {
  if (dir === "up") return "↑";
  if (dir === "down") return "↓";
  return "→";
}

function TrendPill({ trend }) {
  if (!trend?.label || trend.label === "—") return null;
  return (
    <span className={`analytics-resultado-trend-pill analytics-trend-${trend.dir || "flat"}`}>
      {arrow(trend.dir)} {trend.label}
    </span>
  );
}

export default function AnalyticsResultadoPeriodo({
  titulo = "Resultado del período",
  ingreso = 0,
  costoMateriaPrima = 0,
  gastosNegocio = 0,
  costoTotal = 0,
  gananciaBruta = 0,
  gananciaNeta = 0,
  margenBruto = null,
  margenNeto = null,
  comparativoLabel,
  comparativoGananciaNeta,
  trendGananciaNeta,
  prorrateoLabel,
}) {
  const total = costoTotal || costoMateriaPrima + gastosNegocio;
  const bruta = gananciaBruta || ingreso - costoMateriaPrima;
  const neta = gananciaNeta ?? ingreso - total;
  const netaNegativa = neta < 0;
  const netaCero = neta === 0;

  const costosTotales = costoMateriaPrima + gastosNegocio;
  const mostrarBarra = ingreso > 0 && neta >= 0;
  const barraBase = mostrarBarra ? ingreso : 1;
  const mpPct = mostrarBarra ? (costoMateriaPrima / barraBase) * 100 : 0;
  const gastosPct = mostrarBarra ? (gastosNegocio / barraBase) * 100 : 0;
  const netaPct = mostrarBarra ? Math.max(0, (neta / barraBase) * 100) : 0;

  const heroClass = netaNegativa
    ? "analytics-resultado-hero analytics-resultado-hero--loss"
    : netaCero
      ? "analytics-resultado-hero analytics-resultado-hero--neutral"
      : "analytics-resultado-hero";
  const heroValueClass = netaNegativa
    ? "analytics-resultado-hero-value analytics-resultado-hero-value--loss"
    : netaCero
      ? "analytics-resultado-hero-value analytics-resultado-hero-value--neutral"
      : "analytics-resultado-hero-value";
  const margenNetoNegativo = margenNeto != null && margenNeto < 0;

  return (
    <div className="card analytics-resultado-card">
      <div className="card-header">
        <span className="card-title">{titulo}</span>
      </div>

      <div className="analytics-resultado">
        <div className={heroClass}>
          <div className="analytics-resultado-hero-head">
            <span className="analytics-resultado-hero-label">Ganancia neta</span>
            <TrendPill trend={trendGananciaNeta} />
          </div>
          <div className={heroValueClass}>{fmt(neta)}</div>
          {comparativoLabel != null && comparativoGananciaNeta != null && (
            <div className="analytics-resultado-vs">
              {comparativoLabel}:{" "}
              <strong>{fmt(comparativoGananciaNeta)}</strong>
            </div>
          )}
        </div>

        {mostrarBarra && (
          <div className="analytics-resultado-visual">
            <div
              className="analytics-resultado-bar"
              role="img"
              aria-label={`Materia prima ${Math.round(mpPct)}%, gastos del negocio ${Math.round(gastosPct)}%, ganancia ${Math.round(netaPct)}%`}
            >
              {mpPct > 0 && (
                <div
                  className="analytics-resultado-bar-seg analytics-resultado-bar-seg--mp"
                  style={{ width: `${mpPct}%` }}
                />
              )}
              {gastosPct > 0 && (
                <div
                  className="analytics-resultado-bar-seg analytics-resultado-bar-seg--gastos"
                  style={{ width: `${gastosPct}%` }}
                />
              )}
              {netaPct > 0 && (
                <div
                  className="analytics-resultado-bar-seg analytics-resultado-bar-seg--neta"
                  style={{ width: `${netaPct}%` }}
                />
              )}
            </div>
            <div className="analytics-resultado-legend">
              {mpPct > 0 && (
                <span className="analytics-resultado-legend-item">
                  <span className="analytics-resultado-dot analytics-resultado-dot--mp" aria-hidden />
                  Materia prima
                </span>
              )}
              {gastosPct > 0 && (
                <span className="analytics-resultado-legend-item">
                  <span className="analytics-resultado-dot analytics-resultado-dot--gastos" aria-hidden />
                  Gastos del negocio
                </span>
              )}
              {netaPct > 0 && (
                <span className="analytics-resultado-legend-item">
                  <span className="analytics-resultado-dot analytics-resultado-dot--neta" aria-hidden />
                  Ganancia
                </span>
              )}
            </div>
          </div>
        )}

        {ingreso > 0 && netaNegativa && (
          <p className="analytics-resultado-loss-note">
            Los costos superan los ingresos en {fmt(costosTotales - ingreso)}.
          </p>
        )}

        <div className="analytics-resultado-chips">
          <div className="analytics-resultado-chip">
            <span className="analytics-resultado-chip-label">Ganancia bruta</span>
            <span className="analytics-resultado-chip-value">{fmt(bruta)}</span>
          </div>
          <div className="analytics-resultado-chip">
            <span className="analytics-resultado-chip-label">Margen bruto</span>
            <span className="analytics-resultado-chip-value">
              {margenBruto != null ? pctFmt(margenBruto) : "—"}
            </span>
          </div>
          <div className="analytics-resultado-chip">
            <span className="analytics-resultado-chip-label">Margen neto</span>
            <span
              className={`analytics-resultado-chip-value${
                margenNetoNegativo
                  ? " analytics-resultado-chip-value--loss"
                  : margenNeto != null
                    ? " analytics-resultado-chip-value--accent"
                    : ""
              }`}
            >
              {margenNeto != null ? pctFmt(margenNeto) : "—"}
            </span>
          </div>
        </div>

        <div className="analytics-resultado-breakdown">
          <div className="analytics-resultado-breakdown-title">Desglose</div>

          <div className="analytics-resultado-line">
            <span className="analytics-resultado-line-label">Ingresos</span>
            <span className="analytics-resultado-line-value">{fmt(ingreso)}</span>
          </div>

          <div className="analytics-resultado-line analytics-resultado-line--cost">
            <span className="analytics-resultado-line-label">Materia prima</span>
            <span className="analytics-resultado-line-value">{fmt(costoMateriaPrima)}</span>
          </div>

          <div className="analytics-resultado-line analytics-resultado-line--cost">
            <div className="analytics-resultado-line-label-block">
              <span className="analytics-resultado-line-label">Gastos del negocio</span>
              {prorrateoLabel && (
                <span className="analytics-resultado-hint">{prorrateoLabel}</span>
              )}
            </div>
            <span className="analytics-resultado-line-value">{fmt(gastosNegocio)}</span>
          </div>

          <div className="analytics-resultado-line analytics-resultado-line--total">
            <span className="analytics-resultado-line-label">Costo total</span>
            <span className="analytics-resultado-line-value">{fmt(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
