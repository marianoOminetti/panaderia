/**
 * Orquestador por tab: según el valor de tab renderiza una sola pantalla y le pasa las props.
 * Pantallas: dashboard, more (MoreMenuScreen), analytics, insumos, recetas, ventas, stock, plan, clientes, gastos.
 * Detalle de props: docs/APP_PROPS_Y_CONTEXT.md y docs/CONTEXTO_APP_PARA_AGENTES.md.
 */
import { lazy, Suspense } from "react";
import { canAccessTab } from "../config/permissions";
import { SyncStatus } from "./ui";

const Dashboard = lazy(() => import("./dashboard/Dashboard"));
const MoreMenuScreen = lazy(() => import("./menu/MoreMenuScreen"));

const Insumos = lazy(() => import("./insumos/Insumos"));
const Ventas = lazy(() => import("./ventas/Ventas"));
const Stock = lazy(() => import("./stock/Stock"));
const PlanSemanal = lazy(() => import("./plan/PlanSemanal"));
const GastosFijos = lazy(() => import("./gastos/GastosFijos"));
const Clientes = lazy(() => import("./clientes/Clientes"));
const Analytics = lazy(() => import("./analytics/Analytics"));
const Recetas = lazy(() => import("./recetas/Recetas"));
const Pedidos = lazy(() => import("./pedidos/Pedidos"));
const Promociones = lazy(() => import("./promociones/Promociones"));

function TabFallback() {
  return (
    <div className="loading">
      <div className="spinner" />
    </div>
  );
}

function LazyTab({ children }) {
  return <Suspense fallback={<TabFallback />}>{children}</Suspense>;
}

export default function AppContent({
  role,
  tab,
  setTab,
  stockProductionPreloadReceta,
  stockProductionPreloadRecetas,
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
  insumosCompraPreload,
  onConsumedInsumosCompraPreload,
  onOpenInsumosCompra,
  loading,
  ventasSyncing,
  dataSyncing,
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
  promociones,
  resumenPlanSemanal,
  actualizarStock,
  actualizarStockBatch,
  registrarMovimientoInsumo,
  consumirInsumosPorStock,
  consumirComponentesDeInsumo,
  loadData,
  appendVentas,
  removeVentas,
  replaceVentas,
  patchStock,
  appendCliente,
  updateClienteInState,
  removeClienteFromState,
  appendReceta,
  updateRecetaInState,
  removeReceta,
  replaceRecetaIngredientes,
  patchRecetasCosts,
  appendInsumo,
  updateInsumoInState,
  removeInsumo,
  upsertPromocionInState,
  removePromocion,
  appendGasto,
  updateGastoInState,
  removeGasto,
  appendPedidos,
  updatePedidosEstado,
  removePedidosByPedidoIdInState,
  upsertInsumoComposicionInState,
  removeInsumoComposicionInState,
  showToast,
  confirm,
  recetasFilterIds,
  setRecetasFilterIds,
  setPlanSemanalVersion,
  ventasPedidoFlag,
  onConsumedVentasPedido,
  ventasFiltroFecha,
  onClearVentasFiltroFecha,
  onAbrirVentasPeriodo,
}) {
  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <span>Cargando...</span>
      </div>
    );
  }
  if (!canAccessTab(role, tab)) return null;
  return (
    <>
      {(ventasSyncing || dataSyncing) && (
        <SyncStatus message={ventasSyncing ? "Sincronizando ventas…" : "Actualizando datos…"} />
      )}
      {/* --- Dashboard --- */}
      {tab === "dashboard" && (
        <LazyTab>
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
        </LazyTab>
      )}
      {/* --- More (menú) --- */}
      {tab === "more" && (
        <LazyTab>
          <MoreMenuScreen items={moreMenuItems} onNavigate={setTab} />
        </LazyTab>
      )}
      {/* --- Analytics --- */}
      {tab === "analytics" && (
        <LazyTab>
        <Analytics
          ventas={ventas}
          recetas={recetas}
          clientes={clientes}
          recetaIngredientes={recetaIngredientes}
          insumos={insumos}
          gastosFijos={gastosFijos}
          onAbrirVentasPeriodo={onAbrirVentasPeriodo}
        />
        </LazyTab>
      )}
      {/* --- Insumos --- */}
      {tab === "insumos" && (
        <LazyTab>
        <Insumos
          insumos={insumos}
          insumoStock={insumoStock}
          insumoMovimientos={insumoMovimientos}
          insumoComposicion={insumoComposicion}
          registrarMovimientoInsumo={registrarMovimientoInsumo}
          consumirComponentesDeInsumo={consumirComponentesDeInsumo}
          recetas={recetas}
          recetaIngredientes={recetaIngredientes}
          precioHistorial={precioHistorial}
          onRefresh={loadData}
          appendInsumo={appendInsumo}
          updateInsumoInState={updateInsumoInState}
          removeInsumo={removeInsumo}
          patchRecetasCosts={patchRecetasCosts}
          upsertInsumoComposicionInState={upsertInsumoComposicionInState}
          removeInsumoComposicionInState={removeInsumoComposicionInState}
          showToast={showToast}
          confirm={confirm}
          compraPreloadInsumos={insumosCompraPreload}
          onConsumedCompraPreload={onConsumedInsumosCompraPreload}
          onVerRecetasAfectadas={(ids) => {
            setRecetasFilterIds(ids || []);
            setTab("recetas");
          }}
        />
        </LazyTab>
      )}
      {/* --- Recetas --- */}
      {tab === "recetas" && (
        <LazyTab>
        <Recetas
          recetas={recetas}
          insumos={insumos}
          recetaIngredientes={recetaIngredientes}
          showToast={showToast}
          onRefresh={loadData}
          appendReceta={appendReceta}
          updateRecetaInState={updateRecetaInState}
          removeReceta={removeReceta}
          replaceRecetaIngredientes={replaceRecetaIngredientes}
          confirm={confirm}
          filterRecetasIds={recetasFilterIds}
          onClearFilter={() => setRecetasFilterIds([])}
        />
        </LazyTab>
      )}
      {/* --- Ventas --- */}
      {tab === "ventas" && (
        <LazyTab>
        <Ventas
          role={role}
          recetas={recetas}
          ventas={ventas}
          clientes={clientes}
          stock={stock}
          actualizarStock={actualizarStock}
          actualizarStockBatch={actualizarStockBatch}
          onRefresh={loadData}
          appendVentas={appendVentas}
          removeVentas={removeVentas}
          replaceVentas={replaceVentas}
          patchStock={patchStock}
          appendPedidos={appendPedidos}
          showToast={showToast}
          confirm={confirm}
          ventasPreloadGrupoKey={ventasPreloadGrupoKey}
          onConsumedVentasPreload={onConsumedVentasPreload}
          ventasNuevaFlag={ventasNuevaFlag}
          onConsumedVentasNueva={onConsumedVentasNueva}
          ventasPedidoFlag={ventasPedidoFlag}
          onConsumedVentasPedido={onConsumedVentasPedido}
          ventasFiltroFecha={ventasFiltroFecha}
          onClearVentasFiltroFecha={onClearVentasFiltroFecha}
          promociones={promociones}
        />
        </LazyTab>
      )}
      {/* --- Promociones --- */}
      {tab === "promociones" && (
        <LazyTab>
        <Promociones
          promociones={promociones}
          recetas={recetas}
          onRefresh={loadData}
          upsertPromocionInState={upsertPromocionInState}
          removePromocion={removePromocion}
          showToast={showToast}
          confirm={confirm}
        />
        </LazyTab>
      )}
      {/* --- Pedidos (MAS) --- */}
      {tab === "pedidos" && (
        <LazyTab>
        <Pedidos
          recetas={recetas}
          pedidos={pedidos}
          clientes={clientes}
          stock={stock}
          actualizarStock={actualizarStock}
          actualizarStockBatch={actualizarStockBatch}
          onRefresh={loadData}
          appendVentas={appendVentas}
          removeVentas={removeVentas}
          patchStock={patchStock}
          updatePedidosEstado={updatePedidosEstado}
          removePedidosByPedidoIdInState={removePedidosByPedidoIdInState}
          showToast={showToast}
          confirm={confirm}
          onOpenNuevoPedido={onOpenNuevoPedido}
        />
        </LazyTab>
      )}
      {/* --- Stock --- */}
      {tab === "stock" && (
        <LazyTab>
        <Stock
          onOpenInsumosCompra={onOpenInsumosCompra}
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
          stockProductionPreloadRecetas={stockProductionPreloadRecetas || (stockProductionPreloadReceta ? [stockProductionPreloadReceta] : null)}
          onConsumedPreloadReceta={onConsumedPreloadReceta}
          stockOpenManual={stockOpenManual}
          onConsumedStockOpenManual={onConsumedStockOpenManual}
        />
        </LazyTab>
      )}
      {/* --- Plan semanal --- */}
      {tab === "plan" && (
        <LazyTab>
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
        </LazyTab>
      )}
      {/* --- Clientes --- */}
      {tab === "clientes" && (
        <LazyTab>
        <Clientes
          ventas={ventas}
          clientes={clientes}
          recetas={recetas}
          pedidos={pedidos}
          onRefresh={loadData}
          appendCliente={appendCliente}
          updateClienteInState={updateClienteInState}
          removeClienteFromState={removeClienteFromState}
          appendPedidos={appendPedidos}
          updatePedidosEstado={updatePedidosEstado}
          removePedidosByPedidoIdInState={removePedidosByPedidoIdInState}
          appendVentas={appendVentas}
          removeVentas={removeVentas}
          patchStock={patchStock}
          showToast={showToast}
          actualizarStock={actualizarStock}
          actualizarStockBatch={actualizarStockBatch}
          confirm={confirm}
        />
        </LazyTab>
      )}
      {/* --- Gastos fijos --- */}
      {tab === "gastos" && (
        <LazyTab>
        <GastosFijos
          gastos={gastosFijos}
          onRefresh={loadData}
          appendGasto={appendGasto}
          updateGastoInState={updateGastoInState}
          removeGasto={removeGasto}
          showToast={showToast}
        />
        </LazyTab>
      )}
    </>
  );
}
