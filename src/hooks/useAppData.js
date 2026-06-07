import { useCallback, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { INSUMOS_SEED } from "../config/appConfig";
import { normalizarPromociones } from "../lib/promociones";
import { hoyLocalISO } from "../lib/dates";
import { fechaHaceDiasISO } from "../lib/recetasParaVenta";
import { reportError } from "../utils/errorReport";
import { perfMark, perfMeasure } from "../lib/perf";

/** PostgREST suele limitar filas por request (p. ej. max_rows 1000); paginamos para no truncar analytics. */
const VENTAS_PAGE = 1000;
const VENTAS_MAX_PAGES = 500;
const VENTAS_PAGE_CONCURRENCY = 4;

function asVentasArray(value) {
  return Array.isArray(value) ? value : [];
}

function isTransientFetchError(error) {
  const msg = error?.message ?? String(error);
  return /failed to fetch|networkerror|load failed/i.test(msg);
}

async function supabaseVentasPage(fechaGte, from, to, fechaLt) {
  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let q = supabase.from("ventas").select("*").gte("fecha", fechaGte);
    if (fechaLt) {
      q = q.lt("fecha", fechaLt);
    }
    const r = await q
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (!r.error || !isTransientFetchError(r.error) || attempt === maxAttempts - 1) {
      return r;
    }
    await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
  }
  return { data: null, error: new Error("Failed to fetch ventas") };
}

function mergeVentasFromFetch(prev, fetched) {
  const list = asVentasArray(fetched);
  const fetchedIds = new Set(list.map((v) => v.id).filter(Boolean));
  const localOnly = asVentasArray(prev).filter((v) => v.id && !fetchedIds.has(v.id));
  return [...localOnly, ...list];
}

async function loadVentasDesde(fechaGte, fechaLt) {
  const first = await supabaseVentasPage(fechaGte, 0, VENTAS_PAGE - 1, fechaLt);
  if (first.error) {
    return { data: null, error: first.error };
  }
  const all = [...(first.data || [])];
  if ((first.data || []).length < VENTAS_PAGE) {
    return { data: all, error: null };
  }

  let page = 1;
  while (page < VENTAS_MAX_PAGES) {
    const pagePromises = [];
    for (
      let i = 0;
      i < VENTAS_PAGE_CONCURRENCY && page < VENTAS_MAX_PAGES;
      i += 1, page += 1
    ) {
      const from = page * VENTAS_PAGE;
      pagePromises.push(
        supabaseVentasPage(fechaGte, from, from + VENTAS_PAGE - 1, fechaLt),
      );
    }
    const results = await Promise.all(pagePromises);
    let truncated = false;
    for (const r of results) {
      if (r.error) {
        return { data: all.length > 0 ? all : null, error: r.error };
      }
      const batch = r.data || [];
      all.push(...batch);
      if (batch.length < VENTAS_PAGE) truncated = true;
    }
    if (truncated) break;
  }
  return { data: all, error: null };
}

/**
 * Carga y mantiene todos los datos de la app (insumos, recetas, ventas, clientes, pedidos, stock, etc.).
 * Usado solo por App.js. loadData() re-fetcha todo; ventas desde hace 36 meses (paginado ante max_rows PostgREST), pedidos 1000, insumo_movimientos 100.
 * @param {{ showToast?: (msg: string) => void, role?: string }} options
 */
export function useAppData({ showToast, role, onCachePatch, onPersistCache } = {}) {
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
  const [promociones, setPromociones] = useState([]);

  const [loading, setLoading] = useState(true);
  const [ventasSyncing, setVentasSyncing] = useState(false);
  const [dataSyncing, setDataSyncing] = useState(false);
  const [ventasHistoricasLoaded, setVentasHistoricasLoaded] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const seededRef = useRef(false);
  seededRef.current = seeded;
  const loadInFlightRef = useRef(null);
  const loadGenerationRef = useRef(0);
  const ventasRef = useRef([]);
  ventasRef.current = ventas;

  const [recetasFilterIds, setRecetasFilterIds] = useState([]);
  const [planSemanalVersion, setPlanSemanalVersion] = useState(0);

  const loadData = useCallback(async ({ background = false, force = false } = {}) => {
    const roleKey = role ?? "__pending__";
    if (!force && loadInFlightRef.current?.roleKey === roleKey) {
      return loadInFlightRef.current.promise;
    }

    const run = async () => {
      const generation = ++loadGenerationRef.current;
      const isStale = () => generation !== loadGenerationRef.current;

      if (!background) {
        perfMark("loadData:start");
        setLoading(true);
      } else {
        setDataSyncing(true);
      }
      const isVenta = role === "venta";
      const ventasRecientesDesde = isVenta
        ? fechaHaceDiasISO(hoyLocalISO(), 6)
        : fechaHaceDiasISO(hoyLocalISO(), 29);

      const stPromise = supabase
        .from("stock")
        .select("receta_id, cantidad")
        .then((r) => ({ ok: !r.error, data: r.data || [] }))
        .catch(() => ({ ok: false, data: [] }));
      const insStPromise = isVenta
        ? Promise.resolve({ ok: true, data: [] })
        : supabase
            .from("insumo_stock")
            .select("insumo_id, cantidad")
            .then((r) => ({ ok: !r.error, data: r.data || [] }))
            .catch(() => ({ ok: false, data: [] }));
      const insMovPromise = isVenta
        ? Promise.resolve({ ok: true, data: [] })
        : supabase
            .from("insumo_movimientos")
            .select("id, insumo_id, tipo, cantidad, valor, created_at")
            .order("created_at", { ascending: false })
            .limit(100)
            .then((r) => ({ ok: !r.error, data: r.data || [] }))
            .catch(() => ({ ok: false, data: [] }));
      const insCompPromise = isVenta
        ? Promise.resolve({ ok: true, data: [] })
        : supabase
            .from("insumo_composicion")
            .select("insumo_id, insumo_id_componente, factor")
            .then((r) => ({ ok: !r.error, data: r.data || [] }))
            .catch(() => ({ ok: false, data: [] }));
      const precioHistPromise = isVenta
        ? Promise.resolve({ ok: true, data: [] })
        : supabase
            .from("precio_historial")
            .select("id, insumo_id, precio_anterior, precio_nuevo, fecha, motivo")
            .order("fecha", { ascending: true })
            .limit(5000)
            .then((r) => ({ ok: !r.error, data: r.data || [] }))
            .catch(() => ({ ok: false, data: [] }));

      const pedidosPromise = isVenta
        ? Promise.resolve({ data: [], error: null })
        : supabase
            .from("pedidos")
            .select("*")
            .order("fecha_entrega", { ascending: true })
            .limit(1000);

      const gastosPromise = isVenta
        ? Promise.resolve({ data: [], error: null })
        : supabase.from("gastos_fijos").select("*").order("nombre");

      const promosPromise = supabase
        .from("promociones")
        .select("*, promocion_recetas(receta_id)")
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
        promosRes,
        precioHistRes,
      ] = await Promise.all([
        isVenta
          ? Promise.resolve({ data: [], error: null })
          : supabase.from("insumos").select("*").order("categoria").order("nombre"),
        supabase.from("recetas").select("*").order("nombre"),
        isVenta
          ? Promise.resolve({ data: [], error: null })
          : supabase.from("receta_ingredientes").select("*"),
        supabase.from("clientes").select("*").order("nombre"),
        pedidosPromise,
        stPromise,
        insStPromise,
        insMovPromise,
        insCompPromise,
        gastosPromise,
        promosPromise,
        precioHistPromise,
      ]);

      if (isStale()) return;

      const authErr = (e) => e && (e.status === 401 || e.status === 403);
      if ([recRes.error, cliRes.error, promosRes?.error].some(authErr)) {
        if (showToast) {
          showToast("🔒 Sesión expirada o sin permisos. Volvé a iniciar sesión.");
        }
        await supabase.auth.signOut();
        setLoading(false);
        setDataSyncing(false);
        return;
      }

      if (insRes.error && !isVenta) {
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
      if (pedRes && pedRes.error && !isVenta) {
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
      if (gastosRes && gastosRes.error && !isVenta) {
        reportError(gastosRes.error, {
          action: "loadData",
          source: "gastos_fijos",
          code: gastosRes.error?.code,
        });
        showToast?.("⚠️ Error al cargar gastos fijos");
      }
      if (promosRes?.error && promosRes.error.code !== "42P01") {
        reportError(promosRes.error, {
          action: "loadData",
          source: "promociones",
          code: promosRes.error?.code,
        });
        showToast?.("⚠️ Error al cargar promociones");
      }

      setInsumos(insRes.data || []);
      setRecetas(recRes.data || []);
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
      if (promosRes?.error?.code === "42P01") {
        setPromociones([]);
      } else {
        setPromociones(normalizarPromociones(promosRes?.data));
      }
      setLoading(false);

      setVentasSyncing(true);
      let recentVentas = [];
      try {
        const venRecent = await loadVentasDesde(ventasRecientesDesde);
        if (venRecent.error) {
          reportError(venRecent.error, {
            action: "loadData",
            source: "ventas",
            code: venRecent.error?.code,
          });
          showToast?.("⚠️ Error al cargar ventas");
        } else {
          recentVentas = asVentasArray(venRecent.data);
          if (!isStale()) {
            setVentas((prev) => mergeVentasFromFetch(prev, venRecent.data));
          }
        }
      } finally {
        if (!isStale()) setVentasSyncing(false);
      }

      if (isStale()) {
        setVentasSyncing(false);
        if (background) setDataSyncing(false);
        return;
      }

      const stockMap = stRes.ok
        ? Object.fromEntries(
            (stRes.data || []).map((s) => [s.receta_id, Number(s.cantidad) || 0]),
          )
        : null;

      onPersistCache?.({
        recetas: recRes.data || [],
        clientes: (cliRes.data || []).filter((c) => c.eliminado !== true),
        stock: stockMap,
        promociones:
          promosRes?.error?.code === "42P01"
            ? []
            : normalizarPromociones(promosRes?.data),
        ventas: recentVentas.length ? recentVentas : ventasRef.current,
      });

      if (!background) {
        perfMark("loadData:end");
        perfMeasure("loadData", "loadData:start", "loadData:end");
      }

      if (!isVenta && !seededRef.current && insRes.data && insRes.data.length === 0) {
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
      if (background) setDataSyncing(false);
    };

    const promise = run().catch((err) => {
      setLoading(false);
      setDataSyncing(false);
      setVentasSyncing(false);
      throw err;
    });
    loadInFlightRef.current = { roleKey, promise };
    try {
      await promise;
    } finally {
      if (loadInFlightRef.current?.promise === promise) {
        loadInFlightRef.current = null;
      }
    }
  }, [role, showToast, onPersistCache]);

  const loadVentasHistoricas = useCallback(async () => {
    if (role === "venta" || ventasHistoricasLoaded) return;
    const ventasDesde = new Date();
    ventasDesde.setMonth(ventasDesde.getMonth() - 36);
    ventasDesde.setDate(1);
    ventasDesde.setHours(0, 0, 0, 0);
    const ventasDesdeStr = `${ventasDesde.getFullYear()}-${String(ventasDesde.getMonth() + 1).padStart(2, "0")}-01`;
    const ventasRecientesDesde = fechaHaceDiasISO(hoyLocalISO(), 29);

    setVentasSyncing(true);
    try {
      const venHist = await loadVentasDesde(ventasDesdeStr, ventasRecientesDesde);
      if (venHist.error) {
        reportError(venHist.error, {
          action: "loadVentasHistoricas",
          source: "ventas_historico",
          code: venHist.error?.code,
        });
        showToast?.("⚠️ Error al cargar histórico de ventas");
        return;
      }
      if (venHist.data?.length) {
        setVentas((prev) => mergeVentasFromFetch(prev, venHist.data));
      }
      setVentasHistoricasLoaded(true);
      onPersistCache?.({ ventasHistoricas: venHist.data || [] });
    } finally {
      setVentasSyncing(false);
    }
  }, [role, showToast, ventasHistoricasLoaded, onPersistCache]);

  const trimVentasToRecent = useCallback((dias = 30) => {
    const desde = fechaHaceDiasISO(hoyLocalISO(), dias - 1);
    setVentas((prev) =>
      asVentasArray(prev).filter((v) => {
        const f = v?.fecha ? String(v.fecha).slice(0, 10) : null;
        return f && f >= desde;
      }),
    );
    setVentasHistoricasLoaded(false);
  }, []);

  const appendVentas = useCallback(
    (newRows) => {
      if (!Array.isArray(newRows) || newRows.length === 0) return;
      setVentas((prev) => [...newRows, ...asVentasArray(prev)]);
      onCachePatch?.({ appendVentas: newRows });
    },
    [onCachePatch],
  );

  const removeVentas = useCallback(
    (ids) => {
      if (!ids?.length) return;
      const idSet = new Set(ids);
      setVentas((prev) => asVentasArray(prev).filter((v) => !idSet.has(v.id)));
      onCachePatch?.({ removeVentasIds: ids });
    },
    [onCachePatch],
  );

  const replaceVentas = useCallback(
    (rows) => {
      if (!Array.isArray(rows) || rows.length === 0) return;
      const byId = new Map(rows.filter((r) => r.id).map((r) => [r.id, r]));
      setVentas((prev) => {
        const next = asVentasArray(prev).map((v) => (byId.has(v.id) ? byId.get(v.id) : v));
        for (const row of rows) {
          if (row.id && !next.some((v) => v.id === row.id)) next.unshift(row);
        }
        return next;
      });
      onCachePatch?.({ replaceVentas: rows });
    },
    [onCachePatch],
  );

  const appendCliente = useCallback(
    (cliente) => {
      if (!cliente?.id) return;
      setClientes((prev) => {
        const next = [...prev.filter((c) => c.id !== cliente.id), cliente];
        onCachePatch?.({ clientes: next });
        return next;
      });
    },
    [onCachePatch],
  );

  const updateClienteInState = useCallback(
    (cliente) => {
      if (!cliente?.id) return;
      setClientes((prev) => {
        const next = prev.map((c) => (c.id === cliente.id ? { ...c, ...cliente } : c));
        onCachePatch?.({ clientes: next });
        return next;
      });
    },
    [onCachePatch],
  );

  const patchStock = useCallback(
    (deltas) => {
      if (!deltas?.length) return;
      setStock((prev) => {
        const next = { ...(prev || {}) };
        for (const { receta_id, delta } of deltas) {
          const actual = Number(next[receta_id]) || 0;
          const deltaNum = Number(delta) || 0;
          next[receta_id] = Math.max(0, actual + deltaNum);
        }
        return next;
      });
      onCachePatch?.({ stockPatch: deltas });
    },
    [onCachePatch],
  );

  const appendReceta = useCallback(
    (receta) => {
      if (!receta?.id) return;
      setRecetas((prev) => {
        const next = [...prev.filter((r) => r.id !== receta.id), receta];
        onCachePatch?.({ recetas: next });
        return next;
      });
    },
    [onCachePatch],
  );

  const updateRecetaInState = useCallback(
    (receta) => {
      if (!receta?.id) return;
      setRecetas((prev) => {
        const next = prev.map((r) => (r.id === receta.id ? { ...r, ...receta } : r));
        onCachePatch?.({ recetas: next });
        return next;
      });
    },
    [onCachePatch],
  );

  const removeReceta = useCallback(
    (id) => {
      if (!id) return;
      setRecetas((prev) => {
        const next = prev.filter((r) => r.id !== id);
        onCachePatch?.({ recetas: next });
        return next;
      });
      setRecetaIngredientes((prev) => prev.filter((ri) => String(ri.receta_id) !== String(id)));
    },
    [onCachePatch],
  );

  const replaceRecetaIngredientes = useCallback((recetaId, rows) => {
    if (!recetaId) return;
    setRecetaIngredientes((prev) => {
      const others = prev.filter((ri) => String(ri.receta_id) !== String(recetaId));
      return [...others, ...(rows || [])];
    });
  }, []);

  const patchRecetasCosts = useCallback(
    (updates) => {
      if (!updates?.length) return;
      setRecetas((prev) => {
        const byId = new Map(updates.map((u) => [u.id, u]));
        const next = prev.map((r) => {
          const u = byId.get(r.id);
          return u
            ? { ...r, costo_lote: u.costo_lote, costo_unitario: u.costo_unitario }
            : r;
        });
        onCachePatch?.({ recetas: next });
        return next;
      });
    },
    [onCachePatch],
  );

  const appendInsumo = useCallback((insumo) => {
    if (!insumo?.id) return;
    setInsumos((prev) => [...prev.filter((i) => i.id !== insumo.id), insumo]);
  }, []);

  const updateInsumoInState = useCallback((insumo) => {
    if (!insumo?.id) return;
    setInsumos((prev) => prev.map((i) => (i.id === insumo.id ? { ...i, ...insumo } : i)));
  }, []);

  const removeInsumo = useCallback((id) => {
    if (!id) return;
    setInsumos((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const upsertPromocionInState = useCallback(
    (promo) => {
      if (!promo?.id) return;
      setPromociones((prev) => {
        const next = [...prev.filter((p) => p.id !== promo.id), promo];
        onCachePatch?.({ promociones: next });
        return next;
      });
    },
    [onCachePatch],
  );

  const removePromocion = useCallback(
    (id) => {
      if (!id) return;
      setPromociones((prev) => {
        const next = prev.filter((p) => p.id !== id);
        onCachePatch?.({ promociones: next });
        return next;
      });
    },
    [onCachePatch],
  );

  const appendGasto = useCallback((gasto) => {
    if (!gasto?.id) return;
    setGastosFijos((prev) => [...prev.filter((g) => g.id !== gasto.id), gasto]);
  }, []);

  const updateGastoInState = useCallback((gasto) => {
    if (!gasto?.id) return;
    setGastosFijos((prev) => prev.map((g) => (g.id === gasto.id ? { ...g, ...gasto } : g)));
  }, []);

  const removeGasto = useCallback((id) => {
    if (!id) return;
    setGastosFijos((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const appendPedidos = useCallback((rows) => {
    if (!rows?.length) return;
    setPedidos((prev) => [...rows, ...prev]);
  }, []);

  const updatePedidosEstado = useCallback((pedido_id, estado) => {
    if (!pedido_id) return;
    setPedidos((prev) =>
      prev.map((p) => (p.pedido_id === pedido_id ? { ...p, estado } : p)),
    );
  }, []);

  const removePedidosByPedidoIdInState = useCallback((pedido_id) => {
    if (!pedido_id) return;
    setPedidos((prev) => prev.filter((p) => p.pedido_id !== pedido_id));
  }, []);

  const removeClienteFromState = useCallback(
    (id) => {
      if (!id) return;
      setClientes((prev) => {
        const next = prev.filter((c) => c.id !== id);
        onCachePatch?.({ clientes: next });
        return next;
      });
    },
    [onCachePatch],
  );

  const upsertInsumoComposicionInState = useCallback((row) => {
    if (!row?.insumo_id || !row?.insumo_id_componente) return;
    setInsumoComposicion((prev) => {
      const filtered = prev.filter(
        (c) =>
          !(
            c.insumo_id === row.insumo_id &&
            c.insumo_id_componente === row.insumo_id_componente
          ),
      );
      return [...filtered, row];
    });
  }, []);

  const removeInsumoComposicionInState = useCallback((insumo_id, insumo_id_componente) => {
    setInsumoComposicion((prev) =>
      prev.filter(
        (c) =>
          !(
            c.insumo_id === insumo_id && c.insumo_id_componente === insumo_id_componente
          ),
      ),
    );
  }, []);

  const hydrateFromCache = useCallback((snapshot) => {
    if (!snapshot) return;
    if (snapshot.recetas) setRecetas(snapshot.recetas);
    if (snapshot.clientes) setClientes(snapshot.clientes);
    if (snapshot.stock) setStock(snapshot.stock);
    if (snapshot.promociones) setPromociones(snapshot.promociones);
    if (Array.isArray(snapshot.ventas)) setVentas(snapshot.ventas);
    setLoading(false);
  }, []);

  const refreshData = useCallback(
    () => loadData({ force: true, background: true }),
    [loadData],
  );

  return {
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
  };
}
