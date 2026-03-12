/**
 * Orquestador por tab: según el valor de tab renderiza una sola pantalla y le pasa las props.
 * Pantallas: dashboard, more (MoreMenuScreen), analytics, insumos, recetas, ventas, stock, plan, clientes, gastos.
 * Detalle de props: docs/APP_PROPS_Y_CONTEXT.md y docs/CONTEXTO_APP_PARA_AGENTES.md.
 */
import Dashboard from "./dashboard/Dashboard";
import Insumos from "./insumos/Insumos";
import Ventas from "./ventas/Ventas";
import Stock from "./stock/Stock";
import PlanSemanal from "./plan/PlanSemanal";
import GastosFijos from "./gastos/GastosFijos";
import Clientes from "./clientes/Clientes";
import Analytics from "./analytics/Analytics";
import Recetas from "./recetas/Recetas";
import MoreMenuScreen from "./menu/MoreMenuScreen";
import Pedidos from "./pedidos/Pedidos";

export default function AppContent({
  tab,
  setTab,
  stockProductionPreloadReceta,
  onOpenCargarProduccion,
  onConsumedPreloadReceta,
  ventasPreloadGrupoKey,
  onOpenGrupoDeuda,
  onConsumedVentasPreload,
  onOpenNuevaVenta,
  onOpenNuevoPedido,
  ventasNuevaFlag,
  onConsumedVentasNueva,
  stockOpenManual,
  onConsumedStockOpenManual,
  loading,
  moreMenuItems,
  insumos,
  recetas,
  ventas,
  recetaIngredientes,
  clientes,
  pedidos,
  stock,
  insumoStock,
  insumoMovimientos,
  insumoComposicion,
  precioHistorial,
  gastosFijos,
  resumenPlanSemanal,
  actualizarStock,
  actualizarStockBatch,
  registrarMovimientoInsumo,
  consumirInsumosPorStock,
  loadData,
  showToast,
  confirm,
  recetasFilterIds,
  setRecetasFilterIds,
  setPlanSemanalVersion,
  ventasPedidoFlag,
  onConsumedVentasPedido,
}) {
  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <span>Cargando...</span>
      </div>
    );
  }
  return (
    <>
      {/* --- Dashboard --- */}
      {tab === "dashboard" && (
        <Dashboard
          insumos={insumos}
          recetas={recetas}
          recetaIngredientes={recetaIngredientes}
          ventas={ventas}
          clientes={clientes}
          stock={stock}
          pedidos={pedidos}
          onNavigate={setTab}
          onOpenCargarProduccion={onOpenCargarProduccion}
          onOpenGrupoDeuda={onOpenGrupoDeuda}
          onOpenNuevaVenta={onOpenNuevaVenta}
          onOpenNuevoPedido={onOpenNuevoPedido}
        />
      )}
      {/* --- More (menú) --- */}
      {tab === "more" && <MoreMenuScreen items={moreMenuItems} onNavigate={setTab} />}
      {/* --- Analytics --- */}
      {tab === "analytics" && (
        <Analytics
          ventas={ventas}
          recetas={recetas}
          clientes={clientes}
          recetaIngredientes={recetaIngredientes}
          insumos={insumos}
          gastosFijos={gastosFijos}
        />
      )}
      {/* --- Insumos --- */}
      {tab === "insumos" && (
        <Insumos
          insumos={insumos}
          insumoStock={insumoStock}
          insumoMovimientos={insumoMovimientos}
          insumoComposicion={insumoComposicion}
          registrarMovimientoInsumo={registrarMovimientoInsumo}
          recetas={recetas}
          recetaIngredientes={recetaIngredientes}
          precioHistorial={precioHistorial}
          onRefresh={loadData}
          showToast={showToast}
          confirm={confirm}
          onVerRecetasAfectadas={(ids) => {
            setRecetasFilterIds(ids || []);
            setTab("recetas");
          }}
        />
      )}
      {/* --- Recetas --- */}
      {tab === "recetas" && (
        <Recetas
          recetas={recetas}
          insumos={insumos}
          recetaIngredientes={recetaIngredientes}
          showToast={showToast}
          onRefresh={loadData}
          confirm={confirm}
          filterRecetasIds={recetasFilterIds}
          onClearFilter={() => setRecetasFilterIds([])}
        />
      )}
      {/* --- Ventas --- */}
      {tab === "ventas" && (
        <Ventas
          recetas={recetas}
          ventas={ventas}
          clientes={clientes}
          stock={stock}
          actualizarStock={actualizarStock}
          actualizarStockBatch={actualizarStockBatch}
          onRefresh={loadData}
          showToast={showToast}
          confirm={confirm}
          ventasPreloadGrupoKey={ventasPreloadGrupoKey}
          onConsumedVentasPreload={onConsumedVentasPreload}
          ventasNuevaFlag={ventasNuevaFlag}
          onConsumedVentasNueva={onConsumedVentasNueva}
          ventasPedidoFlag={ventasPedidoFlag}
          onConsumedVentasPedido={onConsumedVentasPedido}
        />
      )}
      {/* --- Pedidos (MAS) --- */}
      {tab === "pedidos" && (
        <Pedidos
          recetas={recetas}
          pedidos={pedidos}
          clientes={clientes}
          stock={stock}
          actualizarStock={actualizarStock}
          onRefresh={loadData}
          showToast={showToast}
          confirm={confirm}
          onOpenNuevoPedido={onOpenNuevoPedido}
        />
      )}
      {/* --- Stock --- */}
      {tab === "stock" && (
        <Stock
          recetas={recetas}
          stock={stock}
          actualizarStock={actualizarStock}
          actualizarStockBatch={actualizarStockBatch}
          consumirInsumosPorStock={consumirInsumosPorStock}
          insumoStock={insumoStock}
          insumos={insumos}
          recetaIngredientes={recetaIngredientes}
          insumoComposicion={insumoComposicion}
          registrarMovimientoInsumo={registrarMovimientoInsumo}
          onRefresh={loadData}
          showToast={showToast}
          ventas={ventas}
          pedidos={pedidos}
          stockProductionPreloadReceta={stockProductionPreloadReceta}
          onConsumedPreloadReceta={onConsumedPreloadReceta}
          stockOpenManual={stockOpenManual}
          onConsumedStockOpenManual={onConsumedStockOpenManual}
        />
      )}
      {/* --- Plan semanal --- */}
      {tab === "plan" && (
        <PlanSemanal
          recetas={recetas}
          recetaIngredientes={recetaIngredientes}
          insumos={insumos}
          insumoComposicion={insumoComposicion}
          insumoStock={insumoStock}
          actualizarStock={actualizarStock}
          consumirInsumosPorStock={consumirInsumosPorStock}
          showToast={showToast}
          onRefresh={loadData}
          onPlanChanged={() => setPlanSemanalVersion((v) => v + 1)}
        />
      )}
      {/* --- Clientes --- */}
      {tab === "clientes" && (
        <Clientes
          ventas={ventas}
          clientes={clientes}
          recetas={recetas}
          pedidos={pedidos}
          onRefresh={loadData}
          showToast={showToast}
          actualizarStock={actualizarStock}
          confirm={confirm}
        />
      )}
      {/* --- Gastos fijos --- */}
      {tab === "gastos" && (
        <GastosFijos gastos={gastosFijos} onRefresh={loadData} showToast={showToast} />
      )}
    </>
  );
}
