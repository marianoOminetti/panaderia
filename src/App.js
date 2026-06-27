/**
 * Raíz de la app Panadería: auth, datos globales (useAppData), mutaciones de stock, navegación por tab,
 * toasts/confirm, deep links y preloads (ventas, stock). Todo el estado se pasa por props a AppContent.
 * Ver docs/APP_PROPS_Y_CONTEXT.md para el detalle de props y posible evolución a Context.
 */
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { SUPABASE_CONFIG_OK } from "./lib/supabaseClient";
import { useAuth } from "./hooks/useAuth";
import { useAppData } from "./hooks/useAppData";
import { useStockMutations } from "./hooks/useStockMutations";
import { useVentas } from "./hooks/useVentas";
import { usePlanResumen } from "./hooks/usePlanResumen";
import { useSyncVentasPendientes } from "./hooks/useSyncVentasPendientes";
import { useScrollToHide } from "./hooks/useScrollToHide";
import { useInsights } from "./hooks/useInsights";
import { useStockQuickEdit } from "./hooks/useStockQuickEdit";
import {
  getAppCache,
  persistAppCache,
  patchAppCache,
  clearAppCache,
  isVentasHistoricasCacheTrusted,
} from "./lib/sessionCache";
import { reportError } from "./utils/errorReport";
import { MORE_MENU_ITEMS, NAV_TABS, VENTA_NAV_TABS } from "./config/nav";
import { canAccessTab, getAllowedTabs, getDefaultTabForRole, normalizeRole, isVentaRole } from "./config/permissions";
import Toast from "./components/ui/Toast";
import ConfirmDialog from "./components/ui/ConfirmDialog";
import StockQuickEditModal from "./components/stock/StockQuickEditModal";
import ConfigMissing from "./components/auth/ConfigMissing";
import AuthScreen from "./components/auth/AuthScreen";
import { AppDataProvider } from "./context/AppDataContext";
import AppContent from "./components/AppContent";
import AppHeader from "./components/layout/AppHeader";
import ErrorLogOverlay from "./components/layout/ErrorLogOverlay";
import AppNav from "./components/layout/AppNav";
import "./App.css";

export default function App() {
  // --- Auth ---
  const { session, authLoading, signIn, signOut: authSignOut, role, roleLoading } = useAuth();
  // --- Navegación y deep links ---
  const [tab, setTab] = useState(() => {
    if (typeof window === "undefined") return "dashboard";
    const allTabIds = new Set([
      ...NAV_TABS.map((t) => t.id),
      ...MORE_MENU_ITEMS.map((m) => m.id),
    ]);
    const rawHash = window.location.hash || "";
    const hash = rawHash.startsWith("#") ? rawHash.slice(1) : rawHash;
    if (hash && allTabIds.has(hash)) return hash;
    try {
      const stored = window.localStorage.getItem("app.currentTab");
      if (stored && allTabIds.has(stored)) return stored;
    } catch {
      // ignore storage errors
    }
    return "dashboard";
  });
  const [stockProductionPreloadRecetas, setStockProductionPreloadRecetas] = useState(null);
  const [ventasPreloadGrupoKey, setVentasPreloadGrupoKey] = useState(null);
  const [ventasNuevaFlag, setVentasNuevaFlag] = useState(false);
  const [ventasPedidoFlag, setVentasPedidoFlag] = useState(false);
  /** Filtro de fechas en Ventas (p. ej. desde Analytics) */
  const [ventasFiltroFecha, setVentasFiltroFecha] = useState(null);
  const [stockOpenManual, setStockOpenManual] = useState(false);
  const [insumosCompraPreload, setInsumosCompraPreload] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [errorLogOpen, setErrorLogOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const confirmResolveRef = useRef(null);

  // --- UI global (toast, confirm) ---
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

  const handleAbrirVentasPeriodo = useCallback(({ desde, hasta, label }) => {
    if (!desde || !hasta) return;
    setVentasFiltroFecha({
      desde,
      hasta,
      label: label || "",
    });
    setTab("ventas");
  }, []);

  const clearVentasFiltroFecha = useCallback(() => setVentasFiltroFecha(null), []);

  const normalizedRole = normalizeRole(role);
  const roleKey = normalizedRole ?? "__default__";

  const handleCachePatch = useCallback(
    (partial) => {
      patchAppCache(roleKey, partial).catch(() => {});
    },
    [roleKey],
  );

  const handlePersistCache = useCallback(
    (data) => {
      persistAppCache(roleKey, data).catch(() => {});
    },
    [roleKey],
  );

  const handleSignOut = useCallback(async () => {
    try {
      await clearAppCache(roleKey);
    } catch {
      // ignore cache clear errors on logout
    }
    await authSignOut();
  }, [authSignOut, roleKey]);

  // --- Datos (useAppData) ---
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
    promociones,
    loading,
    ventasSyncing,
    dataSyncing,
    setStock,
    setInsumoStock,
    setInsumoMovimientos,
    recetasFilterIds,
    setRecetasFilterIds,
    planSemanalVersion,
    setPlanSemanalVersion,
    loadData,
    refreshData,
    hydrateFromCache,
    appendVentas,
    removeVentas,
    replaceVentas,
    resolveOptimisticVentas,
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
    loadVentasHistoricas,
    trimVentasToRecent,
    ventasHistoricasLoaded,
  } = useAppData({
    showToast,
    role,
    onCachePatch: handleCachePatch,
    onPersistCache: handlePersistCache,
  });

  const appDataContextValue = useMemo(
    () => ({
      ventas,
      stock,
      recetas,
      clientes,
      appendVentas,
      removeVentas,
      replaceVentas,
      patchStock,
      appendCliente,
      updateClienteInState,
    }),
    [
      ventas,
      stock,
      recetas,
      clientes,
      appendVentas,
      removeVentas,
      replaceVentas,
      patchStock,
      appendCliente,
      updateClienteInState,
    ],
  );

  const { actualizarStock, actualizarStockBatch, registrarMovimientoInsumo, consumirInsumosPorStock, consumirComponentesDeInsumo } =
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

  const { deleteVentas, insertVentas } = useVentas();

  const resumenPlanSemanal = usePlanResumen({
    recetas,
    recetaIngredientes,
    insumos,
    insumoComposicion,
    insumoStock,
    planSemanalVersion,
    enabled: tab === "plan",
  });

  useSyncVentasPendientes({
    session,
    isOnline,
    actualizarStockBatch,
    deleteVentas,
    insertVentas,
    loadData,
    resolveOptimisticVentas,
    showToast,
  });

  const roleReady = !session || !roleLoading;
  const allowedTabs = getAllowedTabs(normalizedRole);
  const ventaRole = isVentaRole(normalizedRole);
  const navTabs = ventaRole
    ? VENTA_NAV_TABS
    : NAV_TABS.filter((t) => allowedTabs.includes(t.id));
  const moreMenuItems = MORE_MENU_ITEMS.filter((m) => allowedTabs.includes(m.id));
  const defaultTab = getDefaultTabForRole(normalizedRole);

  const insightsEnabled = canAccessTab(normalizedRole, "insights");
  const insights = useInsights({
    enabled: insightsEnabled,
    ventas,
    recetas,
    clientes,
    recetaIngredientes,
    insumos,
    stock,
    precioHistorial,
  });
  const insightsUrgentCount = insightsEnabled
    ? insights.all.filter((i) => i.severity === "urgent").length
    : 0;

  const { openQuickEdit: openStockQuickEdit, modalProps: stockQuickEditModalProps } =
    useStockQuickEdit({
      recetas,
      recetaIngredientes,
      insumos,
      insumoComposicion,
      insumoStock,
      stock,
      actualizarStock,
      actualizarStockBatch,
      consumirInsumosPorStock,
      onRefresh: refreshData,
      showToast,
      onOpenInsumosCompra: (insumosEnCero) => {
        setInsumosCompraPreload(insumosEnCero || null);
        setTab("insumos");
      },
    });

  // Deep link:
  const applyDeepLink = useCallback(() => {
    if (typeof window === "undefined" || !window.location.search) return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    const ventaKey = params.get("venta");
    if (tabParam === "ventas" && ventaKey && canAccessTab(normalizedRole, "ventas")) {
      setTab("ventas");
      setVentasPreloadGrupoKey(ventaKey);
    }
  }, [normalizedRole]);

  useEffect(() => {
    applyDeepLink();
  }, [applyDeepLink]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleFocus = () => applyDeepLink();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [applyDeepLink]);

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

  // Persistir tab actual en hash + localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const allTabIds = new Set(allowedTabs);
    if (!allTabIds.has(tab)) return;
    const desiredHash = `#${tab}`;
    if (window.location.hash !== desiredHash) {
      window.location.hash = tab;
    }
    try {
      window.localStorage.setItem("app.currentTab", tab);
    } catch {
      // ignore storage errors
    }
  }, [allowedTabs, tab]);

  // Soporte para back/forward del navegador via hashchange
  useEffect(() => {
    if (typeof window === "undefined") return;
    const allTabIds = new Set(allowedTabs);
    const handleHashChange = () => {
      const rawHash = window.location.hash || "";
      const next = rawHash.startsWith("#") ? rawHash.slice(1) : rawHash;
      if (next && allTabIds.has(next)) {
        setTab(next);
        try {
          window.localStorage.setItem("app.currentTab", next);
        } catch {
          // ignore storage errors
        }
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [allowedTabs]);

  useEffect(() => {
    if (!roleReady) return;
    if (!canAccessTab(normalizedRole, tab)) {
      setTab(defaultTab);
    }
  }, [defaultTab, normalizedRole, roleReady, tab]);

  useEffect(() => {
    if (!session || !roleReady) return;
    let cancelled = false;
    const key = normalizeRole(role) ?? "__pending__";
    (async () => {
      const cache = await getAppCache(key);
      const hasCachedCatalog =
        cache?.catalog &&
        Array.isArray(cache.catalog.recetas) &&
        cache.catalog.recetas.length > 0;
      const historicCacheTrusted = isVentasHistoricasCacheTrusted(cache?.meta);
      const historicVentas = Array.isArray(cache?.ventasHistoricas?.ventas)
        ? cache.ventasHistoricas.ventas
        : null;
      const cacheSnapshot = hasCachedCatalog
        ? {
            ...cache.catalog,
            ventas: cache.ventasRecent?.ventas,
            ventasHistoricas: historicCacheTrusted ? historicVentas : null,
            ventasHistoricasLoaded:
              historicCacheTrusted && historicVentas != null,
          }
        : null;

      if (!cancelled && cacheSnapshot) {
        hydrateFromCache(cacheSnapshot);
        loadData({ background: true }).catch((err) => {
          reportError(err, { action: "bootBackgroundLoad" });
          showToast(
            "⚠️ No se pudieron actualizar los datos. Mostrando la última copia guardada.",
          );
        });
        return;
      }

      if (!cancelled) {
        try {
          await loadData();
        } catch (err) {
          reportError(err, { action: "bootLoad" });
          if (cacheSnapshot) {
            hydrateFromCache(cacheSnapshot);
            showToast(
              "⚠️ Error de conexión. Mostrando la última copia guardada.",
            );
          } else {
            showToast("⚠️ No se pudieron cargar los datos. Reintentá en unos segundos.");
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, roleReady, loadData, role, hydrateFromCache, showToast]);

  useEffect(() => {
    if (!session || !roleReady || loading) return;
    const persist = () => {
      if (document.visibilityState !== "hidden") return;
      handlePersistCache({
        recetas,
        clientes,
        stock,
        promociones,
        ventas,
      });
    };
    document.addEventListener("visibilitychange", persist);
    return () => document.removeEventListener("visibilitychange", persist);
  }, [
    session,
    roleReady,
    loading,
    recetas,
    clientes,
    stock,
    promociones,
    ventas,
    handlePersistCache,
  ]);

  const loadingRef = useRef(loading);
  loadingRef.current = loading;
  const bootCompletedAtRef = useRef(0);
  useEffect(() => {
    if (!loading && session && roleReady) {
      bootCompletedAtRef.current = Date.now();
    }
  }, [loading, session, roleReady]);

  const shouldSkipBackgroundRefresh = useCallback(() => {
    if (loadingRef.current) return true;
    const sinceBoot = Date.now() - bootCompletedAtRef.current;
    return bootCompletedAtRef.current > 0 && sinceBoot < 5000;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPageShow = () => {
      if (!session || !roleReady || shouldSkipBackgroundRefresh()) return;
      refreshData();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [session, roleReady, refreshData, shouldSkipBackgroundRefresh]);

  const lastVisibilityRefreshRef = useRef(0);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (!session || !roleReady || shouldSkipBackgroundRefresh()) return;
      const now = Date.now();
      const throttleMs = normalizedRole === "venta" ? 60_000 : 30_000;
      if (now - lastVisibilityRefreshRef.current < throttleMs) return;
      lastVisibilityRefreshRef.current = now;
      refreshData();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [session, roleReady, refreshData, normalizedRole, shouldSkipBackgroundRefresh]);

  useEffect(() => {
    if ((tab === "analytics" || tab === "clientes") && normalizedRole !== "venta") {
      loadVentasHistoricas();
    }
  }, [tab, loadVentasHistoricas, normalizedRole]);

  useEffect(() => {
    if (!roleReady || !session) return;
    if (canAccessTab(normalizedRole, "stock")) {
      import("./components/stock/Stock");
    }
  }, [roleReady, session, normalizedRole]);

  const prevTabRef = useRef(tab);
  useEffect(() => {
    if (
      prevTabRef.current === "analytics" &&
      tab !== "analytics" &&
      normalizedRole !== "venta" &&
      !ventasFiltroFecha &&
      !["ventas", "clientes"].includes(tab)
    ) {
      trimVentasToRecent(30);
    }
    prevTabRef.current = tab;
  }, [tab, trimVentasToRecent, normalizedRole, ventasFiltroFecha]);

  const isMoreSection =
    tab === "more" || MORE_MENU_ITEMS.some((m) => m.id === tab);
  const stockMap = stock && typeof stock === "object" && !Array.isArray(stock) ? stock : {};
  const sinStockCount = recetas.filter((r) => (stockMap[r.id] ?? 0) <= 0).length;
  const { headerVisible, navVisible } = useScrollToHide();

  const handleManualRefresh = useCallback(async () => {
    showToast("Actualizando datos…");
    try {
      await refreshData();
      showToast("✅ Datos actualizados");
    } catch {
      showToast("⚠️ No se pudieron actualizar los datos");
    }
  }, [refreshData, showToast]);

  if (!SUPABASE_CONFIG_OK) return <ConfigMissing />;
  if (authLoading || (session && !roleReady)) {
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
  if (!normalizedRole) {
    return (
      <div className="app" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="auth-card">
          <h2 className="auth-title" style={{ marginBottom: 8 }}>Acceso sin rol asignado</h2>
          <p className="page-subtitle" style={{ marginBottom: 12 }}>
            Tu usuario no tiene permisos configurados. Pedí al administrador que te asigne un rol.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => handleSignOut().catch(() => showToast("Error al cerrar sesión"))}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <AppHeader
        visible={headerVisible}
        setErrorLogOpen={setErrorLogOpen}
        signOut={handleSignOut}
        showToast={showToast}
        onGoHome={() => setTab(defaultTab)}
        onRefresh={handleManualRefresh}
        refreshing={dataSyncing || ventasSyncing}
      />
      {errorLogOpen && <ErrorLogOverlay onClose={() => setErrorLogOpen(false)} />}
      <AppDataProvider value={appDataContextValue}>
      <AppContent
        role={normalizedRole}
        userId={session?.user?.id ?? null}
        tab={tab}
        setTab={setTab}
        stockProductionPreloadRecetas={stockProductionPreloadRecetas}
        onOpenCargarProduccion={(recetaOrRecetas) => {
          const list = Array.isArray(recetaOrRecetas)
            ? recetaOrRecetas
            : recetaOrRecetas
              ? [recetaOrRecetas]
              : null;
          setStockProductionPreloadRecetas(list);
          setTab("stock");
        }}
        onConsumedPreloadReceta={() => setStockProductionPreloadRecetas(null)}
        ventasPreloadGrupoKey={ventasPreloadGrupoKey}
        onOpenGrupoDeuda={(grupo) => {
          setVentasPreloadGrupoKey(grupo?.key ?? null);
          setTab("ventas");
        }}
        onConsumedVentasPreload={() => setVentasPreloadGrupoKey(null)}
        onOpenNuevaVenta={() => {
          setVentasNuevaFlag(true);
          setTab("ventas");
        }}
        ventasNuevaFlag={ventasNuevaFlag}
        onConsumedVentasNueva={() => setVentasNuevaFlag(false)}
        onOpenNuevoPedido={() => {
          setVentasPedidoFlag(true);
          setTab("ventas");
        }}
        ventasPedidoFlag={ventasPedidoFlag}
        onConsumedVentasPedido={() => setVentasPedidoFlag(false)}
        stockOpenManual={stockOpenManual}
        onConsumedStockOpenManual={() => setStockOpenManual(false)}
        insumosCompraPreload={insumosCompraPreload}
        onConsumedInsumosCompraPreload={() => setInsumosCompraPreload(null)}
        onOpenInsumosCompra={(insumosEnCero) => {
          setInsumosCompraPreload(insumosEnCero || null);
          setTab("insumos");
        }}
        loading={loading}
        ventasSyncing={ventasSyncing}
        ventasHistoricasLoaded={ventasHistoricasLoaded}
        dataSyncing={dataSyncing}
        moreMenuItems={moreMenuItems}
        sinStockCount={sinStockCount}
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
        insights={insights}
        onStockQuickEdit={openStockQuickEdit}
        gastosFijos={gastosFijos}
        promociones={promociones}
        resumenPlanSemanal={resumenPlanSemanal}
        actualizarStock={actualizarStock}
        actualizarStockBatch={actualizarStockBatch}
        registrarMovimientoInsumo={registrarMovimientoInsumo}
        consumirInsumosPorStock={consumirInsumosPorStock}
        consumirComponentesDeInsumo={consumirComponentesDeInsumo}
        loadData={refreshData}
        appendVentas={appendVentas}
        removeVentas={removeVentas}
        replaceVentas={replaceVentas}
        resolveOptimisticVentas={resolveOptimisticVentas}
        patchStock={patchStock}
        appendCliente={appendCliente}
        updateClienteInState={updateClienteInState}
        removeClienteFromState={removeClienteFromState}
        appendReceta={appendReceta}
        updateRecetaInState={updateRecetaInState}
        removeReceta={removeReceta}
        replaceRecetaIngredientes={replaceRecetaIngredientes}
        patchRecetasCosts={patchRecetasCosts}
        appendInsumo={appendInsumo}
        updateInsumoInState={updateInsumoInState}
        removeInsumo={removeInsumo}
        upsertPromocionInState={upsertPromocionInState}
        removePromocion={removePromocion}
        appendGasto={appendGasto}
        updateGastoInState={updateGastoInState}
        removeGasto={removeGasto}
        appendPedidos={appendPedidos}
        updatePedidosEstado={updatePedidosEstado}
        removePedidosByPedidoIdInState={removePedidosByPedidoIdInState}
        upsertInsumoComposicionInState={upsertInsumoComposicionInState}
        removeInsumoComposicionInState={removeInsumoComposicionInState}
        showToast={showToast}
        confirm={confirm}
        recetasFilterIds={recetasFilterIds}
        setRecetasFilterIds={setRecetasFilterIds}
        setPlanSemanalVersion={setPlanSemanalVersion}
        ventasFiltroFecha={ventasFiltroFecha}
        onClearVentasFiltroFecha={clearVentasFiltroFecha}
        onAbrirVentasPeriodo={handleAbrirVentasPeriodo}
      />
      </AppDataProvider>
      <AppNav
        visible={navVisible}
        tab={tab}
        setTab={setTab}
        isMoreSection={isMoreSection}
        sinStockCount={sinStockCount}
        insightsUrgentCount={insightsUrgentCount}
        navTabs={navTabs}
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
      <StockQuickEditModal {...stockQuickEditModalProps} />
    </div>
  );
}
