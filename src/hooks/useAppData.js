import { useCallback, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { INSUMOS_SEED } from "../config/appConfig";
import { reportError } from "../utils/errorReport";

/** PostgREST suele limitar filas por request (p. ej. max_rows 1000); paginamos para no truncar analytics. */
const VENTAS_PAGE = 1000;
const VENTAS_MAX_PAGES = 500;

async function loadVentasDesde(fechaGte) {
  const all = [];
  for (let page = 0; page < VENTAS_MAX_PAGES; page++) {
    const from = page * VENTAS_PAGE;
    const to = from + VENTAS_PAGE - 1;
    const r = await supabase
      .from("ventas")
      .select("*")
      .gte("fecha", fechaGte)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (r.error) {
      return { data: all.length > 0 ? all : null, error: r.error };
    }
    const batch = r.data || [];
    all.push(...batch);
    if (batch.length < VENTAS_PAGE) break;
  }
  return { data: all, error: null };
}

/**
 * Carga y mantiene todos los datos de la app (insumos, recetas, ventas, clientes, pedidos, stock, etc.).
 * Usado solo por App.js. loadData() re-fetcha todo; ventas desde hace 36 meses (paginado ante max_rows PostgREST), pedidos 1000, insumo_movimientos 100.
 * @param {{ showToast?: (msg: string) => void }} options
 * @returns {{ insumos, recetas, ventas, recetaIngredientes, clientes, pedidos, stock, insumoStock, insumoMovimientos, insumoComposicion, precioHistorial, gastosFijos, loading, loadData, setStock, setInsumoStock, setInsumoMovimientos, recetasFilterIds, setRecetasFilterIds, planSemanalVersion, setPlanSemanalVersion }}
 */
export function useAppData({ showToast } = {}) {
  const [insumos, setInsumos] = useState([]);
  const [recetas, setRecetas] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [recetaIngredientes, setRecetaIngredientes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [stock, setStock] = useState({});
  const [insumoStock, setInsumoStock] = useState({});
  const [insumoMovimientos, setInsumoMovimientos] = useState([]);
  const [insumoComposicion, setInsumoComposicion] = useState([]);
  const [precioHistorial, setPrecioHistorial] = useState([]);
  const [gastosFijos, setGastosFijos] = useState([]);

  const [loading, setLoading] = useState(true);
  const [seeded, setSeeded] = useState(false);
  const seededRef = useRef(false);
  seededRef.current = seeded;

  // UI-related shared states currently owned by App
  const [recetasFilterIds, setRecetasFilterIds] = useState([]);
  const [planSemanalVersion, setPlanSemanalVersion] = useState(0);

  // Límites de carga en queries: pedidos 1000, insumo_movimientos 100, precio_historial 5000.
  // Ventas: todas desde fecha >= inicio del mes hace 36 meses (analytics por mes histórico).
  const loadData = useCallback(async () => {
    const ventasDesde = new Date();
    ventasDesde.setMonth(ventasDesde.getMonth() - 36);
    ventasDesde.setDate(1);
    ventasDesde.setHours(0, 0, 0, 0);
    const ventasDesdeStr = `${ventasDesde.getFullYear()}-${String(ventasDesde.getMonth() + 1).padStart(2, "0")}-01`;

    const ventasPromise = loadVentasDesde(ventasDesdeStr);

    const stPromise = supabase
      .from("stock")
      .select("receta_id, cantidad")
      .then((r) => ({ ok: !r.error, data: r.data || [] }))
      .catch(() => ({ ok: false, data: [] }));
    const insStPromise = supabase
      .from("insumo_stock")
      .select("insumo_id, cantidad")
      .then((r) => ({ ok: !r.error, data: r.data || [] }))
      .catch(() => ({ ok: false, data: [] }));
    const insMovPromise = supabase
      .from("insumo_movimientos")
      .select("id, insumo_id, tipo, cantidad, valor, created_at")
      .order("created_at", { ascending: false })
      .limit(100)
      .then((r) => ({ ok: !r.error, data: r.data || [] }))
      .catch(() => ({ ok: false, data: [] }));
    const insCompPromise = supabase
      .from("insumo_composicion")
      .select("insumo_id, insumo_id_componente, factor")
      .then((r) => ({ ok: !r.error, data: r.data || [] }))
      .catch(() => ({ ok: false, data: [] }));
    const precioHistPromise = supabase
      .from("precio_historial")
      .select("id, insumo_id, precio_anterior, precio_nuevo, fecha, motivo")
      .order("fecha", { ascending: true })
      .limit(5000)
      .then((r) => ({ ok: !r.error, data: r.data || [] }))
      .catch(() => ({ ok: false, data: [] }));

    const pedidosPromise = supabase
      .from("pedidos")
      .select("*")
      .order("fecha_entrega", { ascending: true })
      .limit(1000);

    const gastosPromise = supabase
      .from("gastos_fijos")
      .select("*")
      .order("nombre");

    const [
      insRes,
      recRes,
      riRes,
      cliRes,
      pedRes,
      stRes,
      insStRes,
      insMovRes,
      insCompRes,
      gastosRes,
      precioHistRes,
      venRes,
    ] = await Promise.all([
      supabase.from("insumos").select("*").order("categoria").order("nombre"),
      supabase.from("recetas").select("*").order("nombre"),
      supabase.from("receta_ingredientes").select("*"),
      supabase.from("clientes").select("*").order("nombre"),
      pedidosPromise,
      stPromise,
      insStPromise,
      insMovPromise,
      insCompPromise,
      gastosPromise,
      precioHistPromise,
      ventasPromise,
    ]);

    const authErr = (e) => e && (e.status === 401 || e.status === 403);
    if (
      [
        insRes.error,
        recRes.error,
        venRes.error,
        riRes.error,
        cliRes.error,
        pedRes?.error,
        gastosRes?.error,
      ].some(authErr)
    ) {
      if (showToast) {
        showToast("🔒 Sesión expirada o sin permisos. Volvé a iniciar sesión.");
      }
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (insRes.error) {
      reportError(insRes.error, {
        action: "loadData",
        source: "insumos",
        code: insRes.error?.code,
      });
      showToast?.("⚠️ Error al cargar insumos");
    }
    if (recRes.error) {
      reportError(recRes.error, {
        action: "loadData",
        source: "recetas",
        code: recRes.error?.code,
      });
      showToast?.("⚠️ Error al cargar recetas");
    }
    if (venRes.error) {
      reportError(venRes.error, {
        action: "loadData",
        source: "ventas",
        code: venRes.error?.code,
      });
      showToast?.("⚠️ Error al cargar ventas");
    }
    if (pedRes && pedRes.error) {
      reportError(pedRes.error, {
        action: "loadData",
        source: "pedidos",
        code: pedRes.error.code,
        message: pedRes.error.message,
        details: pedRes.error.details,
      });
      if (pedRes.error.code === "42P01") {
        showToast?.(
          "ℹ️ Configurá la tabla 'pedidos' en Supabase para usar pedidos futuros",
        );
      } else {
        showToast?.("⚠️ Error al cargar pedidos");
      }
    }
    if (gastosRes && gastosRes.error) {
      reportError(gastosRes.error, {
        action: "loadData",
        source: "gastos_fijos",
        code: gastosRes.error?.code,
      });
      showToast?.("⚠️ Error al cargar gastos fijos");
    }

    setInsumos(insRes.data || []);
    setRecetas(recRes.data || []);
    setVentas(venRes.data || []);
    setRecetaIngredientes(riRes.data || []);
    setClientes((cliRes.data || []).filter((c) => c.eliminado !== true));
    if (pedRes && pedRes.data) setPedidos(pedRes.data || []);
    else setPedidos([]);

    if (stRes.ok) {
      setStock(
        Object.fromEntries(
          (stRes.data || []).map((s) => [s.receta_id, Number(s.cantidad) || 0]),
        ),
      );
    }
    if (insStRes.ok) {
      setInsumoStock(
        Object.fromEntries(
          (insStRes.data || []).map((s) => [s.insumo_id, Number(s.cantidad) || 0]),
        ),
      );
    }
    if (insMovRes.ok) setInsumoMovimientos(insMovRes.data || []);
    if (insCompRes.ok) setInsumoComposicion(insCompRes.data || []);
    if (precioHistRes.ok) setPrecioHistorial(precioHistRes.data || []);
    setGastosFijos(gastosRes?.data || []);
    setLoading(false);

    // Seed insumos if empty (ref evita que loadData cambie de identidad y dispare doble carga)
    if (!seededRef.current && insRes.data && insRes.data.length === 0) {
      try {
        const { error } = await supabase.from("insumos").insert(INSUMOS_SEED);
        if (error) {
          console.error("[useAppData/seedInsumos]", error);
          throw error;
        }
        seededRef.current = true;
        setSeeded(true);
        const { data: fresh } = await supabase
          .from("insumos")
          .select("*")
          .order("categoria")
          .order("nombre");
        setInsumos(fresh || []);
        showToast?.("✅ Insumos del Excel cargados automáticamente");
      } catch {
        showToast?.("⚠️ Error al cargar insumos iniciales");
      }
    } else if (insRes.data?.length > 0) {
      seededRef.current = true;
      setSeeded(true);
    }
  }, [showToast]);

  return {
    // data
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
    // setters needed by other hooks/mutations
    setStock,
    setInsumoStock,
    setInsumoMovimientos,
    // UI-ish state
    recetasFilterIds,
    setRecetasFilterIds,
    planSemanalVersion,
    setPlanSemanalVersion,
    // actions
    loadData,
  };
}

