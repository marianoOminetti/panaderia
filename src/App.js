import { useState, useEffect, useCallback, useRef } from "react";
import { SUPABASE_CONFIG_OK } from "./lib/supabaseClient";
import { useAuth } from "./hooks/useAuth";
import { useAppData } from "./hooks/useAppData";
import { useStockMutations } from "./hooks/useStockMutations";
import { useVentas } from "./hooks/useVentas";
import { usePlanResumen } from "./hooks/usePlanResumen";
import { useSyncVentasPendientes } from "./hooks/useSyncVentasPendientes";
import { MORE_MENU_ITEMS } from "./config/nav";
import Toast from "./components/ui/Toast";
import ConfirmDialog from "./components/ui/ConfirmDialog";
import ConfigMissing from "./components/auth/ConfigMissing";
import AuthScreen from "./components/auth/AuthScreen";
import AppContent from "./components/AppContent";
import AppHeader from "./components/layout/AppHeader";
import ErrorLogOverlay from "./components/layout/ErrorLogOverlay";
import AppNav from "./components/layout/AppNav";
import "./App.css";

export default function App() {
  const { session, authLoading, signIn, signOut } = useAuth();
  const [tab, setTab] = useState("dashboard");
  const [stockProductionPreloadReceta, setStockProductionPreloadReceta] = useState(null);
  const [ventasPreloadGrupoKey, setVentasPreloadGrupoKey] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [errorLogOpen, setErrorLogOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const confirmResolveRef = useRef(null);

  const showToast = useCallback((msg) => setToast(msg), []);
  const confirm = useCallback((message, { destructive = false } = {}) => {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmState({ message, destructive });
    });
  }, []);

  const handleConfirm = useCallback((ok) => {
    if (confirmResolveRef.current) confirmResolveRef.current(ok);
    confirmResolveRef.current = null;
    setConfirmState(null);
  }, []);

  const {
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
    loading,
    setStock,
    setInsumoStock,
    setInsumoMovimientos,
    recetasFilterIds,
    setRecetasFilterIds,
    planSemanalVersion,
    setPlanSemanalVersion,
    loadData,
  } = useAppData({ showToast });

  const { actualizarStock, actualizarStockBatch, registrarMovimientoInsumo, consumirInsumosPorStock } =
    useStockMutations({
      recetas,
      recetaIngredientes,
      insumos,
      insumoComposicion,
      stock,
      setStock,
      insumoStock,
      setInsumoStock,
      setInsumoMovimientos,
      showToast,
    });

  const { deleteVentas } = useVentas();

  const resumenPlanSemanal = usePlanResumen({
    recetas,
    recetaIngredientes,
    insumos,
    insumoComposicion,
    insumoStock,
    planSemanalVersion,
  });

  useSyncVentasPendientes({
    session,
    isOnline,
    actualizarStock,
    deleteVentas,
    loadData,
    showToast,
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") return;
    if (Notification.permission === "default") Notification.requestPermission().catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (session) loadData();
  }, [session, loadData]);

  const isMoreSection = ["analytics", "plan", "clientes", "insumos", "recetas"].includes(tab);
  const sinStockCount = recetas.filter((r) => (stock[r.id] ?? 0) <= 0).length;

  if (!SUPABASE_CONFIG_OK) return <ConfigMissing />;
  if (authLoading) {
    return (
      <div
        className="app"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}
      >
        <div className="loading">
          <div className="spinner" />
          <span>Cargando...</span>
        </div>
      </div>
    );
  }
  if (!session) return <AuthScreen signIn={signIn} />;

  return (
    <div className="app">
      <AppHeader setErrorLogOpen={setErrorLogOpen} signOut={signOut} showToast={showToast} onGoHome={() => setTab("dashboard")} />
      {errorLogOpen && <ErrorLogOverlay onClose={() => setErrorLogOpen(false)} />}
      <AppContent
        tab={tab}
        setTab={setTab}
        stockProductionPreloadReceta={stockProductionPreloadReceta}
        onOpenCargarProduccion={(receta) => {
          setStockProductionPreloadReceta(receta);
          setTab("stock");
        }}
        onConsumedPreloadReceta={() => setStockProductionPreloadReceta(null)}
        ventasPreloadGrupoKey={ventasPreloadGrupoKey}
        onOpenGrupoDeuda={(grupo) => {
          setVentasPreloadGrupoKey(grupo?.key ?? null);
          setTab("ventas");
        }}
        onConsumedVentasPreload={() => setVentasPreloadGrupoKey(null)}
        loading={loading}
        moreMenuItems={MORE_MENU_ITEMS}
        insumos={insumos}
        recetas={recetas}
        ventas={ventas}
        recetaIngredientes={recetaIngredientes}
        clientes={clientes}
        pedidos={pedidos}
        stock={stock}
        insumoStock={insumoStock}
        insumoMovimientos={insumoMovimientos}
        insumoComposicion={insumoComposicion}
        precioHistorial={precioHistorial}
        gastosFijos={gastosFijos}
        resumenPlanSemanal={resumenPlanSemanal}
        actualizarStock={actualizarStock}
        actualizarStockBatch={actualizarStockBatch}
        registrarMovimientoInsumo={registrarMovimientoInsumo}
        consumirInsumosPorStock={consumirInsumosPorStock}
        loadData={loadData}
        showToast={showToast}
        confirm={confirm}
        recetasFilterIds={recetasFilterIds}
        setRecetasFilterIds={setRecetasFilterIds}
        setPlanSemanalVersion={setPlanSemanalVersion}
      />
      <AppNav
        tab={tab}
        setTab={setTab}
        isMoreSection={isMoreSection}
        sinStockCount={sinStockCount}
      />
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
      {confirmState && (
        <ConfirmDialog
          message={confirmState.message}
          destructive={confirmState.destructive}
          onConfirm={() => handleConfirm(true)}
          onCancel={() => handleConfirm(false)}
        />
      )}
    </div>
  );
}
