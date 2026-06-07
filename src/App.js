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
import {
  getAppCache,
  persistAppCache,
  patchAppCache,
  clearAppCache,
} from "./lib/sessionCache";
import { MORE_MENU_ITEMS, NAV_TABS } from "./config/nav";
import { canAccessTab, getAllowedTabs, getDefaultTabForRole, normalizeRole } from "./config/permissions";
import Toast from "./components/ui/Toast";
import ConfirmDialog from "./components/ui/ConfirmDialog";
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
    setStock,
    setInsumoStock,
    setInsumoMovimientos,
    recetasFilterIds,
    setRecetasFilterIds,
    planSemanalVersion,
    setPlanSemanalVersion,
    loadData,
    hydrateFromCache,
    appendVentas,
    removeVentas,
    replaceVentas,
    patchStock,
    appendCliente,
    updateClienteInState,
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

  const { deleteVentas } = useVentas();

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
    loadData,
    appendVentas,
    showToast,
  });

  const roleReady = !session || !roleLoading;
  const allowedTabs = getAllowedTabs(normalizedRole);
  const navTabs = NAV_TABS.filter((t) => allowedTabs.includes(t.id));
  const moreMenuItems = MORE_MENU_ITEMS.filter((m) => allowedTabs.includes(m.id));
  const defaultTab = getDefaultTabForRole(normalizedRole);

  // Deep link: al cargar o al ganar foco, si la URL tiene ?tab=ventas&venta=KEY, abrir tab Ventas y esa venta
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
      const canHydrate =
        cache?.catalog &&
        (cache.catalogFresh || cache.ventasRecentFresh);
      if (!cancelled && canHydrate) {
        hydrateFromCache({
          ...cache.catalog,
          ventas: cache.ventasRecentFresh ? cache.ventasRecent?.ventas : undefined,
        });
        await loadData({ background: true });
      } else if (!cancelled) {
        await loadData();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, roleReady, loadData, role, hydrateFromCache]);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPageShow = (e) => {
      if (!session || !roleReady) return;
      if (e.persisted) {
        loadData({ background: true });
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [session, roleReady, loadData]);

  useEffect(() => {
    if (tab === "analytics" && !ventasHistoricasLoaded && normalizedRole !== "venta") {
      loadVentasHistoricas();
    }
  }, [tab, ventasHistoricasLoaded, loadVentasHistoricas, normalizedRole]);

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

  const isMoreSection = ["analytics", "plan", "clientes", "insumos", "recetas"].includes(tab);
  const sinStockCount = recetas.filter((r) => (stock[r.id] ?? 0) <= 0).length;
  const { headerVisible, navVisible } = useScrollToHide();

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
      <AppHeader visible={headerVisible} setErrorLogOpen={setErrorLogOpen} signOut={handleSignOut} showToast={showToast} onGoHome={() => setTab(defaultTab)} />
      {errorLogOpen && <ErrorLogOverlay onClose={() => setErrorLogOpen(false)} />}
      <AppDataProvider value={appDataContextValue}>
      <AppContent
        role={normalizedRole}
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
        moreMenuItems={moreMenuItems}
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
        promociones={promociones}
        resumenPlanSemanal={resumenPlanSemanal}
        actualizarStock={actualizarStock}
        actualizarStockBatch={actualizarStockBatch}
        registrarMovimientoInsumo={registrarMovimientoInsumo}
        consumirInsumosPorStock={consumirInsumosPorStock}
        consumirComponentesDeInsumo={consumirComponentesDeInsumo}
        loadData={loadData}
        appendVentas={appendVentas}
        removeVentas={removeVentas}
        replaceVentas={replaceVentas}
        appendCliente={appendCliente}
        updateClienteInState={updateClienteInState}
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
    </div>
  );
}
