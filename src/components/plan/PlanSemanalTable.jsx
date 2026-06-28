import PlanSemanalVistaDia from "./PlanSemanalVistaDia";
import PlanSemanalAlertasRecetas from "./PlanSemanalAlertasRecetas";
import PlanSemanalComparacionVentas from "./PlanSemanalComparacionVentas";
import PlanSemanalMasasResumen from "./PlanSemanalMasasResumen";

function PlanSemanalTable({
  recetas,
  weekStart,
  semanaTitulo,
  cambiarSemana,
  cartPlanItems,
  masasCalculadas,
  masasPlanificadas,
  recetasIncompletas,
  comparacionVentas,
  loading,
  saving,
  addToPlanOnDay,
  updatePlanCartItem,
  guardarPlan,
  copiarPlanSemanaAnterior,
  hasCambiosSinGuardar,
  onShareWeek,
  onShareDay,
}) {
  if (loading) {
    return (
      <div className="card">
        <div className="loading">
          <div className="spinner" />
          <span>Cargando plan...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header plan-cart-header">
        <span className="card-title">Plan de producción</span>
        <div className="plan-cart-header-actions">
          <button
            type="button"
            className="plan-icon-btn"
            onClick={onShareWeek}
            disabled={saving || !cartPlanItems.length}
            title="Compartir plan de la semana como imagen"
          >
            <span className="plan-icon-btn__emoji" aria-hidden>📤</span>
            <span className="plan-icon-btn__label">Compartir semana</span>
          </button>
          <button
            type="button"
            className="edit-btn"
            onClick={copiarPlanSemanaAnterior}
            disabled={saving}
            title="Copia el plan guardado de la semana anterior"
          >
            Copiar sem. ant.
          </button>
        </div>
      </div>

      <div className="plan-semana-strip">
        <button
          type="button"
          className="edit-btn plan-semana-btn"
          onClick={() => cambiarSemana(-1)}
          aria-label="Semana anterior"
        >
          ←
        </button>
        <span className="plan-semana-label">{semanaTitulo}</span>
        <button
          type="button"
          className="edit-btn plan-semana-btn"
          onClick={() => cambiarSemana(1)}
          aria-label="Semana siguiente"
        >
          →
        </button>
      </div>

      <PlanSemanalAlertasRecetas recetasIncompletas={recetasIncompletas} />
      <PlanSemanalComparacionVentas comparacionVentas={comparacionVentas} />

      <PlanSemanalVistaDia
        weekStart={weekStart}
        cartPlanItems={cartPlanItems}
        recetas={recetas}
        saving={saving}
        addToPlanOnDay={addToPlanOnDay}
        updatePlanCartItem={updatePlanCartItem}
        onShareDay={onShareDay}
      />

      <PlanSemanalMasasResumen
        masasPlanificadas={masasPlanificadas}
        masasCalculadas={masasCalculadas}
      />

      <div className="plan-footer">
        {cartPlanItems.length > 0 && !hasCambiosSinGuardar() && !saving && (
          <p className="plan-notice plan-notice--success">
            Plan guardado ({cartPlanItems.length} ítem
            {cartPlanItems.length === 1 ? "" : "s"}). La lista de compras usa estos números.
          </p>
        )}

        {hasCambiosSinGuardar() && !saving && (
          <p className="plan-notice plan-notice--warn">
            Tenés cambios sin guardar. Guardá para actualizar la semana y la lista de compras.
          </p>
        )}

        <button
          type="button"
          className="btn-primary plan-save-btn"
          onClick={guardarPlan}
          disabled={saving || loading || !hasCambiosSinGuardar()}
        >
          {saving
            ? "Guardando..."
            : hasCambiosSinGuardar() || cartPlanItems.length === 0
              ? "Guardar plan semanal"
              : "Plan guardado"}
        </button>
      </div>
    </div>
  );
}

export default PlanSemanalTable;
