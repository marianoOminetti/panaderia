import QuantityControl from "../ui/QuantityControl";
import { ventasRecetaSemanaAnterior } from "../../lib/planSugerencias";

function PlanItemRow({ item, ventas, weekStart, saving, onUpdate, onRemove }) {
  const { receta, cantidad } = item;
  const unidad = receta.unidad_rinde || "u";
  const vendido = ventasRecetaSemanaAnterior(ventas, receta.id, weekStart);

  return (
    <div className="plan-semanal-row">
      <span className="plan-dia-item-emoji">{receta.emoji}</span>
      <div className="plan-semanal-row-info">
        <span className="plan-dia-item-nombre">{receta.nombre}</span>
        <span className="plan-dia-item-sub plan-ref-ventas">
          {vendido > 0 ? `Referencia: vendiste ${vendido} ${unidad} la sem. pasada` : "Sin ventas la sem. pasada"}
        </span>
      </div>
      <div className="plan-semanal-row-qty">
        <span className="plan-semanal-qty-label">A producir</span>
        <QuantityControl
          value={cantidad}
          onChange={(n) => onUpdate(receta.id, { cantidad: Math.max(0, Math.round(n)) })}
          min={0}
          allowDecimals={false}
          size="sm"
          disabled={saving}
        />
        <span className="plan-semanal-unidad">{unidad}</span>
      </div>
      <button
        type="button"
        className="plan-remove-btn"
        onClick={() => onRemove(receta.id)}
        disabled={saving}
        aria-label={`Quitar ${receta.nombre}`}
      >
        ×
      </button>
    </div>
  );
}

export default function PlanSemanalLista({
  cartPlanItems,
  ventas,
  weekStart,
  saving,
  updatePlanCartItem,
  removeFromPlanCart,
}) {
  if (!cartPlanItems.length) {
    return (
      <p className="plan-empty-hint">
        Agregá productos y definí cuánto vas a producir esta semana.
      </p>
    );
  }

  return (
    <div className="plan-semanal-lista">
      <p className="plan-section-label">1 · Productos a producir</p>
      <p className="plan-reparto-intro">
        Total semanal de cada producto. Las ventas son solo referencia.
      </p>
      <div className="plan-semanal-rows">
        {cartPlanItems.map((item) => (
          <PlanItemRow
            key={item.receta.id}
            item={item}
            ventas={ventas}
            weekStart={weekStart}
            saving={saving}
            onUpdate={updatePlanCartItem}
            onRemove={removeFromPlanCart}
          />
        ))}
      </div>
    </div>
  );
}
