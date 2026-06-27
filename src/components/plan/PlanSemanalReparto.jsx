import { useMemo } from "react";
import PlanSemanalDiaGrid from "./PlanSemanalDiaGrid";
import { sumPorDia } from "../../lib/planSugerencias";

function RepartoRow({
  item,
  saving,
  onDayChange,
  onRepartirVentas,
  onRepartirUniforme,
  onAjustarAlTotal,
}) {
  const { receta, cantidad, porDia } = item;
  const sumaDias = sumPorDia(porDia);
  const ok = sumaDias === cantidad;
  const unidad = receta.unidad_rinde || "u";

  return (
    <div className={`plan-reparto-row ${ok ? "" : "plan-reparto-row--warn"}`}>
      <div className="plan-reparto-row-head">
        <span className="plan-dia-item-emoji">{receta.emoji}</span>
        <div className="plan-semanal-row-info">
          <span className="plan-dia-item-nombre">{receta.nombre}</span>
          <span className="plan-dia-item-sub">
            Total semanal: {cantidad} {unidad}
            {!ok && (
              <span className="plan-reparto-mismatch">
                {" "}· en días: {sumaDias} {unidad}
                {sumaDias < cantidad ? ` (faltan ${cantidad - sumaDias})` : ` (sobran ${sumaDias - cantidad})`}
              </span>
            )}
          </span>
        </div>
      </div>
      <PlanSemanalDiaGrid
        porDia={porDia}
        disabled={saving}
        metaTotal={cantidad}
        onChange={(diaIdx, val) => onDayChange(receta.id, diaIdx, val)}
      />
      <div className="plan-reparto-actions">
        <button type="button" className="btn-secondary plan-reparto-btn" disabled={saving} onClick={() => onRepartirVentas(receta.id)}>
          Como vendí
        </button>
        <button type="button" className="btn-secondary plan-reparto-btn" disabled={saving} onClick={() => onRepartirUniforme(receta.id)}>
          Repartir parejo
        </button>
        {!ok && (
          <button type="button" className="btn-secondary plan-reparto-btn" disabled={saving} onClick={() => onAjustarAlTotal(receta.id)}>
            Ajustar al total
          </button>
        )}
      </div>
    </div>
  );
}

export default function PlanSemanalReparto({
  cartPlanItems,
  saving,
  updatePlanCartItem,
  repartirItemSegunVentas,
  repartirItemUniforme,
  ajustarRepartoAlTotal,
  repartirTodosSegunVentas,
}) {
  const incompletos = useMemo(
    () => cartPlanItems.filter((it) => sumPorDia(it.porDia) !== it.cantidad).length,
    [cartPlanItems],
  );

  if (!cartPlanItems.length) return null;

  return (
    <div className="plan-reparto-section">
      <div className="plan-reparto-header">
        <div>
          <p className="plan-section-label">2 · Repartir por día</p>
          <p className="plan-reparto-intro">
            Movelo a lun–dom. La suma de cada fila tiene que coincidir con el total del paso 1.
          </p>
        </div>
        {incompletos > 0 && (
          <span className="plan-reparto-badge">{incompletos} sin cerrar</span>
        )}
      </div>
      <button
        type="button"
        className="btn-secondary plan-reparto-todos-btn"
        disabled={saving}
        onClick={repartirTodosSegunVentas}
      >
        Repartir todo como vendí
      </button>
      <div className="plan-reparto-list">
        {cartPlanItems.map((item) => (
          <RepartoRow
            key={item.receta.id}
            item={item}
            saving={saving}
            onDayChange={(recetaId, diaIdx, val) => updatePlanCartItem(recetaId, { porDiaIdx: diaIdx, porDiaVal: val })}
            onRepartirVentas={repartirItemSegunVentas}
            onRepartirUniforme={repartirItemUniforme}
            onAjustarAlTotal={ajustarRepartoAlTotal}
          />
        ))}
      </div>
    </div>
  );
}
