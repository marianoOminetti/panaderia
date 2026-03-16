/**
 * Paginación simple: Anterior | Página X de Y | Siguiente
 */
export default function Pagination({
  page,
  totalPages,
  onPrev,
  onNext,
  label = "Página",
}) {
  if (totalPages <= 1) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        marginTop: 12,
      }}
    >
      <button
        type="button"
        className="edit-btn"
        onClick={onPrev}
        disabled={page <= 1}
        aria-label="Página anterior"
      >
        ← Anterior
      </button>
      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
        {label} {page} de {totalPages}
      </span>
      <button
        type="button"
        className="edit-btn"
        onClick={onNext}
        disabled={page >= totalPages}
        aria-label="Página siguiente"
      >
        Siguiente →
      </button>
    </div>
  );
}
