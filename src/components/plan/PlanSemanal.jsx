import { useState } from "react";
import { buildCompraWhatsAppText } from "../../lib/planShare";
import { usePlanSemanalScreen } from "../../hooks/usePlanSemanalScreen";
import PlanSemanalTable from "./PlanSemanalTable";
import PlanSemanalActions from "./PlanSemanalActions";
import PlanShareModal from "./PlanShareModal";

function PlanSemanal({
  recetas, recetaIngredientes, insumos, insumoComposicion, insumoStock, ventas,
  actualizarStock, consumirInsumosPorStock, showToast, onRefresh, onPlanChanged,
}) {
  const plan = usePlanSemanalScreen({
    recetas, recetaIngredientes, insumos, insumoComposicion, insumoStock, ventas,
    actualizarStock, consumirInsumosPorStock, showToast, onRefresh, onPlanChanged,
  });
  const [shareTarget, setShareTarget] = useState(null);

  const openShareWeek = () => {
    if (!plan.cartPlanItems.length) {
      showToast("No hay nada planificado para compartir.");
      return;
    }
    setShareTarget({ mode: "week" });
  };

  const openShareDay = (diaIdx) => {
    const hasItems = plan.cartPlanItems.some((it) => (it.porDia?.[diaIdx] || 0) > 0);
    if (!hasItems) {
      showToast("Este día no tiene ítems planificados.");
      return;
    }
    setShareTarget({ mode: "day", diaIdx });
  };

  const openShareCompra = () => {
    if (!plan.insumosCompra.length) {
      showToast("No hay faltantes para compartir.");
      return;
    }
    setShareTarget({ mode: "compra" });
  };

  const compraWaTextUrl = plan.insumosCompra.length
    ? `https://wa.me/?text=${encodeURIComponent(
        buildCompraWhatsAppText(plan.insumosCompra, plan.semanaTitulo()),
      )}`
    : null;

  return (
    <div className="content">
      <p className="page-title">Plan semanal</p>
      <p className="page-subtitle">Planificá qué se produce cada día (sábado a viernes): masas, productos, lo que vaya.</p>

      <PlanSemanalTable
        recetas={recetas}
        recetaIngredientes={recetaIngredientes}
        weekStart={plan.weekStart}
        semanaTitulo={plan.semanaTitulo()}
        cambiarSemana={plan.cambiarSemana}
        cartPlanItems={plan.cartPlanItems}
        masasCalculadas={plan.masasCalculadas}
        masasCalculadasClasificadas={plan.masasCalculadasClasificadas}
        masasPlanificadas={plan.masasPlanificadas}
        coberturaMasas={plan.coberturaMasas}
        completarMasasFaltantes={plan.completarMasasFaltantes}
        recetasIncompletas={plan.recetasIncompletas}
        comparacionVentas={plan.comparacionVentas}
        loading={plan.loading}
        saving={plan.saving}
        addToPlanOnDay={plan.addToPlanOnDay}
        updatePlanCartItem={plan.updatePlanCartItem}
        guardarPlan={plan.guardarPlan}
        copiarPlanSemanaAnterior={plan.copiarPlanSemanaAnterior}
        hasCambiosSinGuardar={plan.hasCambiosSinGuardar}
        onShareWeek={openShareWeek}
        onShareDay={openShareDay}
      />

      <PlanSemanalActions
        insumosCompra={plan.insumosCompra}
        onShareCompra={openShareCompra}
        waTextUrl={compraWaTextUrl}
      />

      {shareTarget && (
        <PlanShareModal
          mode={shareTarget.mode}
          diaIdx={shareTarget.diaIdx}
          weekStart={plan.weekStart}
          cartPlanItems={plan.cartPlanItems}
          insumosCompra={plan.insumosCompra}
          semanaTitulo={plan.semanaTitulo()}
          onClose={() => setShareTarget(null)}
          hasCambiosSinGuardar={plan.hasCambiosSinGuardar()}
        />
      )}
    </div>
  );
}

export default PlanSemanal;
