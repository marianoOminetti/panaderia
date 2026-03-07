/**
 * Navegación de período: flechas ← →, label, botón "Esta semana/mes"
 */
export default function AnalyticsNavPeriodo({
  tipo,
  label,
  esActual,
  onPrev,
  onNext,
  onIrActual,
}) {
  return (
    <div
      className="card-header"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          className="edit-btn"
          onClick={onPrev}
          aria-label={`${tipo} anterior`}
        >
          ←
        </button>
        <span className="card-title" style={{ margin: 0 }}>
          {label}
        </span>
        <button
          type="button"
          className="edit-btn"
          onClick={onNext}
          disabled={esActual}
          aria-label={`${tipo} siguiente`}
        >
          →
        </button>
      </div>
      {!esActual && (
        <button
          type="button"
          className="edit-btn"
          onClick={onIrActual}
          style={{ fontSize: 13 }}
        >
          {tipo === "día" ? "Hoy" : tipo === "semana" ? "Esta semana" : "Este mes"}
        </button>
      )}
    </div>
  );
}
