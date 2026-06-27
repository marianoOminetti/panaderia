export default function PlanSemanalAlertasMasas({
  coberturaMasas,
  onCompletarMasas,
  saving,
}) {
  if (!coberturaMasas) return null;

  const { alertas, recetasIncompletas, ok } = coberturaMasas;
  if (ok) return null;

  return (
    <div className="plan-masas-alertas">
      {alertas.length > 0 && (
        <>
          <p className="plan-masas-alertas-title">⚠️ Masas insuficientes para el plan</p>
          <p className="plan-masas-alertas-sub">
            Según los productos planificados, estas masas no alcanzan:
          </p>
          {alertas.map((a) => (
            <div key={a.receta.id} className="plan-masas-alerta-item">
              <div className="plan-masas-alerta-main">
                <span>
                  {a.receta.emoji} <strong>{a.receta.nombre}</strong>
                </span>
                <span className="plan-masas-alerta-numeros">
                  {a.sinPlanificar ? (
                    <>Necesitás {a.necesarioTotal} {a.unidad} · no planificada</>
                  ) : (
                    <>
                      Planificaste {a.planificadoTotal} {a.unidad}, necesitás {a.necesarioTotal}{" "}
                      {a.unidad} → <strong>faltan {a.faltanteTotal} {a.unidad}</strong>
                    </>
                  )}
                </span>
              </div>
            </div>
          ))}
          {onCompletarMasas && (
            <button
              type="button"
              className="btn-secondary plan-completar-masas-btn"
              onClick={onCompletarMasas}
              disabled={saving}
            >
              Completar masas faltantes
            </button>
          )}
        </>
      )}

      {recetasIncompletas.length > 0 && (
        <div className="plan-masas-incompletas">
          <p className="plan-masas-alertas-sub">
            No se puede calcular la masa para estos productos (revisá gramos por unidad en la receta):
          </p>
          {recetasIncompletas.map(({ producto, masa }) => (
            <div key={`${producto.id}-${masa?.id}`} className="analytics-item">
              <span>
                {producto.emoji} {producto.nombre}
                {masa ? ` → ${masa.emoji} ${masa.nombre}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
