/**
 * Contenedor del Plan semanal: solo orquesta layout y paso de datos.
 * Toda la lógica (semana, carrito, guardado, producir, requerimientos) vive en usePlanSemanalScreen.
 */
import { fmt } from "../../lib/format";
import { usePlanSemanalScreen } from "../../hooks/usePlanSemanalScreen";
import PlanSemanalTable from "./PlanSemanalTable";
import PlanSemanalActions from "./PlanSemanalActions";

function PlanSemanal({
  recetas,
  recetaIngredientes,
  insumos,
  insumoComposicion,
  insumoStock,
  actualizarStock,
  consumirInsumosPorStock,
  showToast,
  onRefresh,
  onPlanChanged,
}) {
  const plan = usePlanSemanalScreen({
    recetas,
    recetaIngredientes,
    insumos,
    insumoComposicion,
    insumoStock,
    actualizarStock,
    consumirInsumosPorStock,
    showToast,
    onRefresh,
    onPlanChanged,
  });

  return (
    <div className="content">
      <p className="page-title">Plan semanal</p>
      <p className="page-subtitle">
        Definí qué vas a producir y generá la lista de compras.
      </p>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">Semana</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <button
            type="button"
            className="btn-secondary"
            style={{ width: "auto", padding: "6px 10px" }}
            onClick={() => plan.cambiarSemana(-1)}
          >
            ← Anterior
          </button>
          <div
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {plan.semanaTitulo()}
          </div>
          <button
            type="button"
            className="btn-secondary"
            style={{ width: "auto", padding: "6px 10px" }}
            onClick={() => plan.cambiarSemana(1)}
          >
            Siguiente →
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">Resumen</span>
        </div>
        <p style={{ fontSize: 13, marginBottom: 4 }}>
          Esta semana producís <strong>{plan.totalPlanificadas}</strong>{" "}
          unidades.
        </p>
        <p style={{ fontSize: 13 }}>
          Necesitás comprar aproximadamente{" "}
          <strong>{fmt(plan.totalCompra || 0)}</strong>{" "}
          en insumos.
        </p>
      </div>

      <PlanSemanalTable
        recetas={recetas}
        planRows={plan.planRows}
        weekStart={plan.weekStart}
        cartPlanItems={plan.cartPlanItems}
        loading={plan.loading}
        saving={plan.saving}
        addToPlanCart={plan.addToPlanCart}
        updatePlanCartQuantity={plan.updatePlanCartQuantity}
        removeFromPlanCart={plan.removeFromPlanCart}
        handleProducir={plan.handleProducir}
        guardarPlan={plan.guardarPlan}
      />

      <PlanSemanalActions
        insumosCompra={plan.insumosCompra}
        waUrl={`https://wa.me/?text=${encodeURIComponent(
          plan.buildWhatsAppText()
        )}`}
      />
    </div>
  );
}

export default PlanSemanal;
