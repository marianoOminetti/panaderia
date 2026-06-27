export default function PlanSemanalAlertasRecetas({ recetasIncompletas }) {
  if (!recetasIncompletas?.length) return null;

  return (
    <div className="plan-notice plan-notice--warn plan-masas-alertas">
      <p className="plan-masas-alertas-title">⚠️ Revisá estas recetas</p>
      <p className="plan-masas-alertas-sub">
        No podemos calcular las masas porque falta data en Recetas (gramos por unidad o vínculo con la masa):
      </p>
      {recetasIncompletas.map(({ producto, masa }) => (
        <div key={`${producto.id}-${masa?.id}`} className="plan-masas-alerta-item">
          <span>
            {producto.emoji} {producto.nombre}
            {masa ? ` → ${masa.emoji} ${masa.nombre}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}
