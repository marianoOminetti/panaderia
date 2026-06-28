/**
 * Pantalla Gastos: resumen KPI, lista filtrable y formulario.
 * Soporta tipo fijo, variable y puntual.
 */
import GastosCierreChecklist from "./GastosCierreChecklist";
import GastosDeleteModal from "./GastosDeleteModal";
import GastosFijosFormModal from "./GastosFijosFormModal";
import GastosLista from "./GastosLista";
import GastosResumen from "./GastosResumen";
import { useGastosFijosScreen } from "../../hooks/useGastosFijosScreen";

export default function GastosFijos({
  gastos,
  onRefresh,
  appendGasto,
  updateGastoInState,
  removeGasto,
  showToast,
  onAbrirAnalytics,
}) {
  const screen = useGastosFijosScreen({
    gastos,
    onRefresh,
    appendGasto,
    updateGastoInState,
    removeGasto,
    showToast,
  });

  return (
    <div className="content">
      <p className="page-title">Gastos</p>
      <p className="page-subtitle">
        Fijos (alquiler, sueldos), variables (luz, gas) y puntuales (arreglos)
      </p>

      <GastosResumen
        dia={screen.dia}
        semana={screen.semana}
        mes={screen.mes}
        desglose={screen.desglose}
        onAbrirAnalytics={onAbrirAnalytics}
      />

      <GastosCierreChecklist
        items={screen.checklistItems}
        weekKey={screen.weekKey}
        checked={screen.checklistChecked}
        onToggle={screen.toggleChecklist}
      />

      <GastosLista
        search={screen.search}
        onSearchChange={screen.setSearch}
        tipoFiltro={screen.tipoFiltro}
        onTipoFiltroChange={(f) => {
          screen.setTipoFiltro(f);
          if (f !== "Variable") screen.setSoloSemanaActual(false);
        }}
        soloSemanaActual={screen.soloSemanaActual}
        onAplicarFacturasSemana={screen.aplicarFacturasSemana}
        ordenMonto={screen.ordenMonto}
        onToggleOrdenMonto={() => screen.setOrdenMonto((v) => !v)}
        gastosVigentes={screen.gastosVigentes}
        vigentesFiltrados={screen.vigentesFiltrados}
        gastosHistoricos={screen.gastosHistoricos}
        showHistoricos={screen.showHistoricos}
        onToggleHistoricos={() => screen.setShowHistoricos((v) => !v)}
        subtotalGrupo={screen.subtotalGrupo}
        onEdit={screen.formState.openEdit}
      />

      <button
        type="button"
        className="fab fab-receta"
        onClick={screen.formState.openNew}
        title="Nuevo gasto"
      >
        <span>+</span>
        <span>Nuevo gasto</span>
      </button>

      <GastosFijosFormModal
        formState={screen.formState}
        onEliminar={screen.eliminar}
      />

      <GastosDeleteModal
        gasto={screen.deleteModal}
        deleteMode={screen.deleteMode}
        deleteDesde={screen.deleteDesde}
        onDeleteModeChange={screen.setDeleteMode}
        onDeleteDesdeChange={screen.setDeleteDesde}
        onConfirm={screen.confirmarEliminacion}
        onCancel={() => screen.setDeleteModal(null)}
      />
    </div>
  );
}
