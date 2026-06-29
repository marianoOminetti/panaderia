/**
 * Barra compacta de alertas + chips de filtro rápido (no bloquea la lista).
 */
export default function RecetasAlertasBar({
  cantProblemas,
  cantMargenBajo,
  filtroAlerta,
  onFiltroProblemas,
  onFiltroMargen,
  onLimpiarFiltro,
}) {
  if (!cantProblemas && !cantMargenBajo && !filtroAlerta) return null;

  return (
    <div className="recetas-alertas-bar">
      {filtroAlerta ? (
        <button type="button" className="recetas-alerta-chip recetas-alerta-chip--active" onClick={onLimpiarFiltro}>
          ✕ {filtroAlerta === "problemas" ? `Revisar (${cantProblemas})` : `Margen bajo (${cantMargenBajo})`}
        </button>
      ) : (
        <>
          {cantProblemas > 0 && (
            <button type="button" className="recetas-alerta-chip recetas-alerta-chip--warn" onClick={onFiltroProblemas}>
              ⚠ {cantProblemas} revisar
            </button>
          )}
          {cantMargenBajo > 0 && (
            <button type="button" className="recetas-alerta-chip recetas-alerta-chip--margen" onClick={onFiltroMargen}>
              📉 {cantMargenBajo} margen bajo
            </button>
          )}
        </>
      )}
    </div>
  );
}
