import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { fmt } from "../lib/format";
import { getPlanSemanaInicioISO } from "../lib/dates";
import { calcularRequerimientoInsumosParaItems, getItemsExplotados } from "../lib/stockPlan";
import { calcularMasasDesdeProductos, evaluarCoberturaMasas } from "../lib/planMasa";
import {
  crearPorDiaVacios, parsePorDiaFromRow, porDiaToJson, sumPorDia,
  cartItemsDesdePlanRows, comparacionPlanVsVentas, getSemanaAnteriorInicioISO,
  getPlanSemanaLunesLegacyISO,
  totalVentasProductosSemanaAnterior,
  distribuirUniforme, rescalePorDia,
} from "../lib/planSugerencias";
import { usePlanSemanal } from "./usePlanSemanal";

function rowToCartItem(row, recetas) {
  const receta = recetas.find((r) => r.id === row.receta_id);
  if (!receta) return null;
  const porDia = parsePorDiaFromRow(row);
  const cantidad = Number(row.cantidad_planificada) || sumPorDia(porDia);
  if (cantidad <= 0) return null;
  return { receta, cantidad, porDia };
}

export function usePlanSemanalScreen({
  recetas, recetaIngredientes, insumos, insumoComposicion, insumoStock, ventas,
  actualizarStock, consumirInsumosPorStock, showToast, onRefresh, onPlanChanged,
}) {
  const { fetchPlan, insertPlanRow, updatePlanRow, deletePlanRow, upsertPlanRow } =
    usePlanSemanal({ onRefresh, onPlanChanged, showToast });

  const [weekStart, setWeekStart] = useState(() => getPlanSemanaInicioISO());
  const [planRows, setPlanRows] = useState([]);
  const [cartPlanItems, setCartPlanItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const loadingErrorShownRef = useRef(false);
  const weekStartRef = useRef(weekStart);

  useEffect(() => { weekStartRef.current = weekStart; }, [weekStart]);

  const cargarPlan = useCallback(async (semanaInicio) => {
    setLoading(true);
    const requested = semanaInicio;
    try {
      let data = await fetchPlan(semanaInicio);
      if (weekStartRef.current !== requested) return;
      const lunesKey = getPlanSemanaLunesLegacyISO(semanaInicio);
      const legacy = await fetchPlan(lunesKey);
      if (weekStartRef.current !== requested) return;
      const sabadoIds = new Set((data || []).map((r) => r.receta_id));
      const legacyRows = (legacy || [])
        .filter((row) => !sabadoIds.has(row.receta_id))
        .map((row) => ({
          ...row,
          semana_inicio: semanaInicio,
          _legacyId: row.id,
        }));
      data = [...(data || []), ...legacyRows];
      setPlanRows(data || []);
      setCartPlanItems((data || [])
        .filter((row) => (row.cantidad_planificada || 0) > 0)
        .map((row) => rowToCartItem(row, recetas)).filter(Boolean));
    } catch {
      if (!loadingErrorShownRef.current) { showToast("⚠️ Error al cargar el plan semanal"); loadingErrorShownRef.current = true; }
      if (weekStartRef.current === requested) { setPlanRows([]); setCartPlanItems([]); }
    } finally {
      if (weekStartRef.current === requested) setLoading(false);
    }
  }, [fetchPlan, showToast, recetas]);

  useEffect(() => { cargarPlan(weekStart); }, [weekStart, cargarPlan]);

  const addToPlanOnDay = useCallback((receta, diaIdx, cantidad = 1) => {
    if (!receta || diaIdx < 0 || diaIdx >= 7) return;
    setCartPlanItems((prev) => {
      const idx = prev.findIndex((it) => it.receta.id === receta.id);
      if (idx >= 0) {
        const copy = [...prev];
        const porDia = [...(copy[idx].porDia || crearPorDiaVacios())];
        porDia[diaIdx] = (porDia[diaIdx] || 0) + cantidad;
        copy[idx] = { ...copy[idx], porDia, cantidad: sumPorDia(porDia) };
        return copy.filter((it) => it.cantidad > 0);
      }
      const porDia = crearPorDiaVacios();
      porDia[diaIdx] = cantidad;
      return [...prev, { receta, cantidad, porDia }];
    });
  }, []);

  const addToPlanCart = useCallback((receta, cantidad = 1) => {
    if (!receta || receta.es_precursora) return;
    setCartPlanItems((prev) => {
      const idx = prev.findIndex((it) => it.receta.id === receta.id);
      if (idx >= 0) {
        const copy = [...prev];
        const nextQty = copy[idx].cantidad + cantidad;
        copy[idx] = { ...copy[idx], cantidad: nextQty, porDia: distribuirUniforme(nextQty) };
        return copy;
      }
      return [...prev, { receta, cantidad, porDia: distribuirUniforme(cantidad) }];
    });
  }, []);

  const updatePlanCartItem = useCallback((recetaId, patch) => {
    setCartPlanItems((prev) => prev.map((item) => {
      if (item.receta.id !== recetaId) return item;
      if (patch.porDiaIdx != null) {
        const porDia = [...(item.porDia || crearPorDiaVacios())];
        porDia[patch.porDiaIdx] = patch.porDiaVal;
        const cantidad = sumPorDia(porDia);
        return cantidad > 0 ? { ...item, porDia, cantidad } : null;
      }
      if (patch.cantidad != null) {
        const qty = Math.max(0, Math.round(patch.cantidad));
        const prevSum = sumPorDia(item.porDia);
        const porDia = prevSum > 0 ? rescalePorDia(item.porDia, qty) : distribuirUniforme(qty);
        return qty > 0 ? { ...item, cantidad: qty, porDia } : null;
      }
      return item;
    }).filter(Boolean));
  }, []);

  const removeFromPlanCart = useCallback((recetaId) => {
    setCartPlanItems((prev) => prev.filter((item) => item.receta.id !== recetaId));
  }, []);

  const mergeCartItems = useCallback((incoming) => {
    setCartPlanItems((prev) => {
      const map = new Map(prev.map((it) => [it.receta.id, { ...it }]));
      for (const item of incoming) map.set(item.receta.id, item);
      return [...map.values()];
    });
  }, []);

  const copiarPlanSemanaAnterior = useCallback(async () => {
    const requestedWeek = weekStart;
    const antInicio = getSemanaAnteriorInicioISO(requestedWeek);
    if (cartPlanItems.length > 0 && !window.confirm("¿Reemplazar el plan actual con el de la semana anterior?")) {
      return;
    }
    try {
      const data = await fetchPlan(antInicio);
      if (weekStartRef.current !== requestedWeek) return;
      const items = cartItemsDesdePlanRows(data, recetas);
      if (!items.length) {
        showToast("No hay plan guardado en la semana anterior.");
        return;
      }
      setCartPlanItems(items);
      showToast(`Plan de la sem. anterior copiado (${items.length} ítems). Revisá y ajustá.`);
    } catch {
      showToast("⚠️ Error al cargar el plan de la semana anterior");
    }
  }, [weekStart, cartPlanItems.length, fetchPlan, recetas, showToast]);

  const comparacionVentas = useMemo(
    () => comparacionPlanVsVentas(cartPlanItems, ventas, weekStart),
    [cartPlanItems, ventas, weekStart],
  );

  const masasCalculadas = useMemo(() => {
    const productos = cartPlanItems.filter((it) => !it.receta.es_precursora);
    if (!productos.length) return [];
    return calcularMasasDesdeProductos(productos, recetaIngredientes, recetas);
  }, [cartPlanItems, recetaIngredientes, recetas]);

  const masasPlanificadas = useMemo(
    () => cartPlanItems.filter((it) => it.receta?.es_precursora),
    [cartPlanItems],
  );

  const recetasIncompletas = useMemo(
    () => evaluarCoberturaMasas(cartPlanItems, recetaIngredientes, recetas).recetasIncompletas,
    [cartPlanItems, recetaIngredientes, recetas],
  );

  const guardarPlan = useCallback(async () => {
    if (!cartPlanItems.length && !(planRows || []).some((pr) => pr.semana_inicio === weekStart && (pr.cantidad_planificada || 0) > 0)) {
      showToast("No hay nada que guardar.");
      return;
    }
    setSaving(true);
    try {
      const existingByReceta = {};
      for (const pr of planRows || []) {
        if (pr.receta_id && pr.semana_inicio === weekStart) existingByReceta[pr.receta_id] = pr;
      }
      for (const { receta, cantidad, porDia } of cartPlanItems) {
        const existente = existingByReceta[receta.id];
        const payload = { cantidad_planificada: cantidad, cantidad_por_dia: porDiaToJson(porDia || crearPorDiaVacios()) };
        if (existente) {
          if (cantidad <= 0) {
            await deletePlanRow(existente._legacyId || existente.id);
          } else if (existente._legacyId) {
            await insertPlanRow({
              semana_inicio: weekStart,
              receta_id: receta.id,
              cantidad_planificada: cantidad,
              cantidad_realizada: Number(existente.cantidad_realizada) || 0,
              cantidad_por_dia: payload.cantidad_por_dia,
            });
            await deletePlanRow(existente._legacyId);
          } else {
            await updatePlanRow(existente.id, payload);
          }
        } else if (cantidad > 0) {
          await insertPlanRow({ semana_inicio: weekStart, receta_id: receta.id, cantidad_planificada: cantidad, cantidad_realizada: 0, cantidad_por_dia: payload.cantidad_por_dia });
        }
      }
      const cartRecetaIds = new Set(cartPlanItems.map((it) => it.receta.id));
      for (const pr of planRows || []) {
        if (pr.semana_inicio === weekStart && !cartRecetaIds.has(pr.receta_id)) {
          await deletePlanRow(pr._legacyId || pr.id);
        }
      }
      const nItems = cartPlanItems.length;
      showToast(
        nItems > 0
          ? `✅ Plan guardado (${nItems} ítem${nItems === 1 ? "" : "s"}). Revisá la lista de compras abajo.`
          : "✅ Plan de la semana vaciado",
      );
      const data = await fetchPlan(weekStart);
      if (weekStartRef.current === weekStart && data) {
        setPlanRows(data);
        setCartPlanItems(data.filter((row) => (row.cantidad_planificada || 0) > 0).map((row) => rowToCartItem(row, recetas)).filter(Boolean));
      }
      onPlanChanged?.();
    } catch (err) {
      console.error("[guardarPlan]", err);
      const detalle = err?.message || err?.details || "";
      showToast(
        detalle
          ? `⚠️ Error al guardar: ${String(detalle).slice(0, 120)}`
          : "⚠️ Error al guardar el plan semanal",
      );
    }
    finally { setSaving(false); }
  }, [planRows, weekStart, cartPlanItems, recetas, deletePlanRow, updatePlanRow, insertPlanRow, fetchPlan, showToast, onPlanChanged]);

  const itemsParaInsumos = useMemo(() => {
    const productos = cartPlanItems.filter((it) => !it.receta.es_precursora);
    return productos.map(({ receta, cantidad: plan }) => {
      const existente = (planRows || []).find((pr) => pr.receta_id === receta.id && pr.semana_inicio === weekStart);
      const pendiente = Math.max(plan - Number(existente?.cantidad_realizada || 0), 0);
      return pendiente > 0 ? { receta, cantidad: pendiente } : null;
    }).filter(Boolean);
  }, [cartPlanItems, planRows, weekStart]);

  const requerimientos = calcularRequerimientoInsumosParaItems(itemsParaInsumos, recetaIngredientes, insumos, insumoComposicion, recetas);
  const insumosCompra = (requerimientos || []).map((req) => {
    const insumo = req.insumo;
    const faltante = Math.max(0, (req.cantidad || 0) - ((insumoStock || {})[req.insumo_id] ?? 0));
    let costo = 0;
    if (faltante > 0 && insumo?.cantidad_presentacion > 0 && insumo.precio != null) {
      costo = (insumo.precio / insumo.cantidad_presentacion) * faltante;
    }
    return { insumo_id: req.insumo_id, insumo, faltante, costo };
  }).filter((x) => x.faltante > 0);

  const totalCompra = insumosCompra.reduce((s, x) => s + (x.costo || 0), 0);
  const totalPlanificadas = cartPlanItems
    .filter((it) => !it.receta.es_precursora)
    .reduce((s, it) => s + (it.cantidad || 0), 0);
  const totalVentasSemanaAnterior = useMemo(
    () => totalVentasProductosSemanaAnterior(ventas, recetas, weekStart),
    [ventas, recetas, weekStart],
  );

  const semanaTitulo = useCallback(() => {
    const inicio = new Date(weekStart);
    const fin = new Date(weekStart); fin.setDate(fin.getDate() + 6);
    return `${inicio.toLocaleDateString("es-AR")} al ${fin.toLocaleDateString("es-AR")}`;
  }, [weekStart]);

  const hasCambiosSinGuardar = useCallback(() => {
    const cartIds = new Set(cartPlanItems.map((it) => it.receta.id));
    for (const pr of planRows || []) {
      if (pr.semana_inicio !== weekStart) continue;
      if (!cartIds.has(pr.receta_id)) return true;
    }
    return cartPlanItems.some((item) => {
      const existente = (planRows || []).find(
        (pr) => pr.receta_id === item.receta.id && pr.semana_inicio === weekStart,
      );
      if (!existente) return true;
      if (item.cantidad !== (Number(existente.cantidad_planificada) || 0)) return true;
      const savedPorDia = parsePorDiaFromRow(existente);
      return (item.porDia || crearPorDiaVacios()).some((v, i) => v !== savedPorDia[i]);
    });
  }, [cartPlanItems, planRows, weekStart, recetas]);

  const cambiarSemana = useCallback((delta) => {
    if (hasCambiosSinGuardar() && !window.confirm("Tenés cambios sin guardar. ¿Cambiar de semana igual?")) return;
    setWeekStart((prev) => { const d = new Date(prev); d.setDate(d.getDate() + delta * 7); return d.toISOString().split("T")[0]; });
  }, [hasCambiosSinGuardar]);

  const buildWhatsAppText = useCallback(() => {
    const inicio = new Date(weekStart); const fin = new Date(weekStart); fin.setDate(fin.getDate() + 6);
    let text = `Plan de producción semanal\n${inicio.toLocaleDateString("es-AR")} al ${fin.toLocaleDateString("es-AR")}`;
    if (totalPlanificadas > 0) text += `\n\nEsta semana producís ${totalPlanificadas} unidades.`;
    if (totalCompra > 0) text += `\nNecesitás comprar aproximadamente ${fmt(totalCompra)} en insumos.`;
    return text;
  }, [weekStart, totalPlanificadas, totalCompra]);

  const handleProducir = useCallback(async (item) => {
    const { receta, cantidad: plan } = item;
    const existente = (planRows || []).find((pr) => pr.receta_id === receta.id && pr.semana_inicio === weekStart);
    const realizado = Number(existente?.cantidad_realizada || 0);
    if (!plan || plan <= 0) { showToast("Agregá cantidad al plan primero."); return; }
    if (realizado >= plan) { showToast("Ya alcanzaste o superaste el plan para esta receta."); return; }
    const cantidad = plan - realizado;
    try {
      await actualizarStock(receta.id, cantidad);
      try {
        if (consumirInsumosPorStock) {
          const exploded = recetas?.length && recetaIngredientes?.length
            ? getItemsExplotados(receta.id, cantidad, recetaIngredientes, recetas) : [{ receta, cantidad }];
          for (const { receta: r, cantidad: c } of exploded) {
            if (r?.id && c > 0) await consumirInsumosPorStock(r.id, c);
          }
        }
        await upsertPlanRow({
          semana_inicio: weekStart, receta_id: receta.id, cantidad_planificada: plan,
          cantidad_realizada: realizado + cantidad,
          cantidad_por_dia: porDiaToJson(item.porDia || crearPorDiaVacios()),
        }, { skipRefresh: true });
      } catch (err) {
        try { await actualizarStock(receta.id, -cantidad); } catch (e) { console.error("[handleProducir] rollback", e); }
        throw err;
      }
      showToast(`✅ Producción registrada: +${cantidad} ${receta.nombre}`);
      const data = await fetchPlan(weekStart);
      if (weekStartRef.current === weekStart && data) setPlanRows(data);
    } catch { showToast("⚠️ Error al registrar la producción"); }
  }, [planRows, weekStart, recetas, recetaIngredientes, actualizarStock, consumirInsumosPorStock, upsertPlanRow, fetchPlan, showToast]);

  return {
    weekStart, planRows, cartPlanItems, loading, saving,
    addToPlanCart, addToPlanOnDay, updatePlanCartItem, removeFromPlanCart, guardarPlan, handleProducir,
    copiarPlanSemanaAnterior, masasCalculadas, masasPlanificadas, recetasIncompletas, comparacionVentas,
    hasCambiosSinGuardar,
    semanaTitulo, cambiarSemana, totalPlanificadas, totalCompra, totalVentasSemanaAnterior,
    insumosCompra, buildWhatsAppText,
  };
}
