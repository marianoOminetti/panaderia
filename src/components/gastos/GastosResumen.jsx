import { fmt } from "../../lib/format";

export default function GastosResumen({
  dia,
  semana,
  mes,
  desglose,
  onAbrirAnalytics,
}) {
  const diff =
    desglose?.semanaAnterior != null
      ? semana - desglose.semanaAnterior
      : null;
  const diffLabel =
    diff == null
      ? null
      : diff === 0
        ? "igual que la semana pasada"
        : diff > 0
          ? `+${fmt(diff)} vs sem. ant.`
          : `${fmt(diff)} vs sem. ant.`;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header">
        <span className="card-title">Resumen</span>
      </div>
      <div className="card-content">
        <div className="receta-stats">
          <div className="receta-stat">
            <div className="receta-stat-label">Diario</div>
            <div className="receta-stat-value">{fmt(dia || 0)}</div>
          </div>
          <button
            type="button"
            className="receta-stat gasto-kpi-btn"
            onClick={() => onAbrirAnalytics?.("detalle-semana")}
            disabled={!onAbrirAnalytics}
            title={onAbrirAnalytics ? "Ver en Analytics" : undefined}
          >
            <div className="receta-stat-label">Esta semana</div>
            <div className="receta-stat-value">{fmt(semana || 0)}</div>
            {diffLabel && (
              <div className="analytics-kpi-sub" style={{ marginTop: 4 }}>
                {diffLabel}
              </div>
            )}
          </button>
          <button
            type="button"
            className="receta-stat gasto-kpi-btn"
            onClick={() => onAbrirAnalytics?.("detalle-mes")}
            disabled={!onAbrirAnalytics}
            title={onAbrirAnalytics ? "Ver en Analytics" : undefined}
          >
            <div className="receta-stat-label">Este mes</div>
            <div className="receta-stat-value">{fmt(mes || 0)}</div>
          </button>
        </div>
        {desglose && (
          <p className="analytics-kpi-sub" style={{ marginTop: 10 }}>
            Fijos esta semana: {fmt(desglose.semanaFijos || 0)} · Extras:{" "}
            {fmt(desglose.semanaExtras || 0)}
          </p>
        )}
        <p className="analytics-kpi-sub" style={{ marginTop: 4 }}>
          Costo fijo prorrateado · fijos + variable/puntual del período
        </p>
      </div>
    </div>
  );
}
