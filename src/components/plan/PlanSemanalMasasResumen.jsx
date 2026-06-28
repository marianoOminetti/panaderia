import { useState } from "react";
import { etiquetaCantidadMasaPlan } from "../../lib/planMasa";
import { getMasaBasePadreId } from "../../lib/recetaTipo";
import { DIAS_INICIAL } from "../../lib/planSugerencias";

function MasasLista({ titulo, items, recetas, recetaIngredientes, className = "" }) {
  if (!items?.length) return null;
  return (
    <>
      <p className="plan-section-label" style={{ marginTop: titulo ? 8 : 0 }}>
        {titulo}
      </p>
      {items.map(({ receta, cantidad, porDia }) => {
        const padreId = getMasaBasePadreId(receta.id, recetaIngredientes);
        const padre = padreId ? (recetas || []).find((r) => String(r.id) === String(padreId)) : null;
        return (
          <div key={receta.id} className={`plan-masas-resumen-item ${className}`.trim()}>
            <span>
              {receta.emoji} <strong>{receta.nombre}</strong>
              {padre && (
                <span className="plan-hint"> ← {padre.nombre}</span>
              )}
            </span>
            <span className="plan-masas-resumen-qty">
              {etiquetaCantidadMasaPlan(receta, cantidad)}
              {porDia?.some((n) => n > 0) && (
                <span className="plan-hint">
                  {" "}
                  ({porDia
                    .map((n, i) => (n > 0 ? `${DIAS_INICIAL[i]}:${etiquetaCantidadMasaPlan(receta, n)}` : null))
                    .filter(Boolean)
                    .join(" · ")})
                </span>
              )}
            </span>
          </div>
        );
      })}
    </>
  );
}

export default function PlanSemanalMasasResumen({
  masasPlanificadas,
  masasCalculadas,
  masasCalculadasClasificadas,
  recetas,
  recetaIngredientes,
}) {
  const [abierto, setAbierto] = useState(false);
  const hayPlan = masasPlanificadas?.length > 0;
  const hayCalc = masasCalculadas?.length > 0;
  if (!hayPlan && !hayCalc) return null;

  const { base: calcBase, porcionadas: calcPorcionadas } =
    masasCalculadasClasificadas || { base: masasCalculadas, porcionadas: [] };

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
                    {etiquetaCantidadMasaPlan(receta, cantidad)} en la semana
                    {porDia?.some((n) => n > 0) && (
                      <span className="plan-hint">
                        {" "}
                        ({porDia
                          .map((n, i) => (n > 0 ? `${DIAS_INICIAL[i]}:${etiquetaCantidadMasaPlan(receta, n)}` : null))
                          .filter(Boolean)
                          .join(" · ")})
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </>
          )}
          {hayCalc && (
            <>
              <MasasLista
                titulo="Necesarias · masas base"
                items={calcBase}
                recetas={recetas}
                recetaIngredientes={recetaIngredientes}
                className="plan-masas-resumen-item--calc"
              />
              <MasasLista
                titulo="Necesarias · masas porcionadas"
                items={calcPorcionadas}
                recetas={recetas}
                recetaIngredientes={recetaIngredientes}
                className="plan-masas-resumen-item--calc"
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
