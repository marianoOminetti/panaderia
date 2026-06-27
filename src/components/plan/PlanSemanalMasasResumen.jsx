import { useState } from "react";
import { DIAS_INICIAL } from "../../lib/planSugerencias";

export default function PlanSemanalMasasResumen({ masasPlanificadas, masasCalculadas }) {
  const [abierto, setAbierto] = useState(false);
  const hayPlan = masasPlanificadas?.length > 0;
  const hayCalc = masasCalculadas?.length > 0;
  if (!hayPlan && !hayCalc) return null;

  return (
    <div className="plan-masas-resumen">
      <button
        type="button"
        className="plan-masas-resumen-toggle"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
      >
        <span className="plan-section-label">Resumen de masas</span>
        <span className="plan-masas-resumen-hint">Lo que planificaste vs lo que piden tus productos</span>
        <span className="plan-masas-resumen-chevron">{abierto ? "▾" : "▸"}</span>
      </button>
      {abierto && (
        <div className="plan-masas-resumen-list">
          {hayPlan && (
            <>
              <p className="plan-section-label">En tu plan (por día)</p>
              {masasPlanificadas.map(({ receta, cantidad, porDia }) => (
                <div key={receta.id} className="plan-masas-resumen-item">
                  <span>{receta.emoji} <strong>{receta.nombre}</strong></span>
                  <span className="plan-masas-resumen-qty">
                    {cantidad} {receta.unidad_rinde || "u"} en la semana
                    {porDia?.some((n) => n > 0) && (
                      <span className="plan-hint">
                        {" "}({porDia.map((n, i) => (n > 0 ? `${DIAS_INICIAL[i]}:${n}` : null)).filter(Boolean).join(" · ")})
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </>
          )}
          {hayCalc && (
            <>
              <p className="plan-section-label" style={{ marginTop: hayPlan ? 12 : 0 }}>
                Necesarias según productos
              </p>
              {masasCalculadas.map(({ receta, cantidad }) => (
                <div key={`calc-${receta.id}`} className="plan-masas-resumen-item plan-masas-resumen-item--calc">
                  <span>{receta.emoji} {receta.nombre}</span>
                  <span className="plan-masas-resumen-qty">{cantidad} {receta.unidad_rinde || "u"}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
