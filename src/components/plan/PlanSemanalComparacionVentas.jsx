export default function PlanSemanalComparacionVentas({ comparacionVentas }) {
  const debajo = (comparacionVentas || []).filter((c) => c.debajo);
  if (!debajo.length) return null;

  return (
    <div className="plan-notice plan-notice--success plan-comparacion-ventas">
      <p className="plan-comparacion-title">Por debajo de lo vendido la sem. pasada</p>
      <p className="plan-reparto-intro">
        Solo informativo — no cambia tu plan. Revisá si querés producir más.
      </p>
      <div className="plan-comparacion-list">
        {debajo.map(({ receta, planificado, vendido, diferencia }) => (
          <div key={receta.id} className="plan-comparacion-item">
            <span>
              {receta.emoji} <strong>{receta.nombre}</strong>
            </span>
            <span className="plan-comparacion-numeros">
              Planificás {planificado} {receta.unidad_rinde || "u"} · vendiste {vendido} →{" "}
              <strong>faltan {diferencia}</strong> vs ventas
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
