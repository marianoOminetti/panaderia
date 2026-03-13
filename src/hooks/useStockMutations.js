import { useCallback } from "react";
import { aGramos, convertirAUnidadInsumo } from "../lib/units";
import { supabase } from "../lib/supabaseClient";
import { notifyEvent } from "../lib/notifyEvent";

/**
 * Mutaciones de stock y insumos: actualizarStock, actualizarStockBatch, registrarMovimientoInsumo, consumirInsumosPorStock.
 * Usado por App.js; recibe datos de recetas, insumos, stock e insumoStock y setters. Persiste en Supabase y notifica.
 * @returns {{ actualizarStock, actualizarStockBatch, registrarMovimientoInsumo, consumirInsumosPorStock }}
 */
export function useStockMutations({
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
}) {
  const actualizarStock = useCallback(
    async (receta_id, delta) => {
      let nuevo;
      let anterior;
      setStock((prevRaw) => {
        const prev = prevRaw || {};
        const actualRaw = prev[receta_id] ?? 0;
        const actual =
          typeof actualRaw === "number"
            ? actualRaw
            : parseFloat(actualRaw) || 0;
        const deltaNum =
          typeof delta === "number" ? delta : parseFloat(delta) || 0;
        anterior = actual;
        nuevo = Math.max(0, actual + deltaNum);
        return { ...prev, [receta_id]: nuevo };
      });
      const { error } = await supabase
        .from("stock")
        .upsert(
          { receta_id, cantidad: nuevo, updated_at: new Date().toISOString() },
          { onConflict: "receta_id" },
        );
      if (error) {
        setStock((prevRaw) => {
          const prev = prevRaw || {};
          return { ...prev, [receta_id]: anterior ?? (prev[receta_id] ?? 0) };
        });
        throw error;
      }
      if (anterior > 0 && nuevo <= 0) {
        const receta = (recetas || []).find((r) => r.id === receta_id);
        const nombre = receta?.nombre || "producto";
        showToast?.(`⚠️ ${nombre}: sin stock`);
        if (
          typeof window !== "undefined" &&
          typeof Notification !== "undefined" &&
          Notification.permission === "granted"
        ) {
          try {
            new Notification("Stock agotado", {
              body: `${nombre} se quedó sin stock.`,
            });
          } catch {
            // ignore notification errors
          }
        }

        if (typeof navigator !== "undefined" && navigator.onLine) {
          notifyEvent("stock_zero", { receta_id });
        }
      }
      return { anterior, nuevo };
    },
    [recetas, setStock, showToast],
  );

  /** Actualiza stock de varias recetas en una sola escritura a la DB. Evita fallos parciales y es más rápido. */
  const actualizarStockBatch = useCallback(
    async (updates) => {
      if (!updates || updates.length === 0) return;
      const deltas = updates.map((u) => ({
        receta_id: u.receta_id,
        delta:
          typeof u.delta === "number"
            ? u.delta
            : parseFloat(u.delta) || 0,
      }));
      const updatedAt = new Date().toISOString();
      // Calcular next y rows desde stock actual (no dentro de setState) para no depender
      // de que React 18 ejecute el updater de forma síncrona.
      const prev = stock ?? {};
      const next = { ...prev };
      for (const { receta_id, delta } of deltas) {
        const actualRaw = next[receta_id] ?? 0;
        const actual =
          typeof actualRaw === "number"
            ? actualRaw
            : parseFloat(actualRaw) || 0;
        const deltaNum =
          typeof delta === "number" ? delta : parseFloat(delta) || 0;
        next[receta_id] = Math.max(0, actual + deltaNum);
      }
      const rows = deltas.map(({ receta_id }) => ({
        receta_id,
        cantidad:
          typeof next[receta_id] === "number"
            ? next[receta_id]
            : parseFloat(next[receta_id]) || 0,
        updated_at: updatedAt,
      }));
      setStock(next);
      const { error } = await supabase
        .from("stock")
        .upsert(rows, { onConflict: "receta_id" });
      if (error) {
        setStock((prevRaw) => {
          const prev = prevRaw || {};
          return prev;
        });
        throw error;
      }

      // Notificaciones de stock en cero (usando cantidades ya calculadas en rows)
      if (rows.length > 0) {
        for (const { receta_id, delta } of deltas) {
          const row = rows.find((r) => r.receta_id === receta_id);
          const nuevo = row ? (typeof row.cantidad === "number" ? row.cantidad : parseFloat(row.cantidad) || 0) : 0;
          const deltaNum =
            typeof delta === "number" ? delta : parseFloat(delta) || 0;
          const anterior = nuevo - deltaNum;
          if (anterior > 0 && nuevo <= 0) {
            const receta = (recetas || []).find((r) => r.id === receta_id);
            const nombre = receta?.nombre || "producto";
            showToast?.(`⚠️ ${nombre}: sin stock`);
            if (typeof navigator !== "undefined" && navigator.onLine) {
              notifyEvent("stock_zero", { receta_id });
            }
          }
        }
      }
    },
    [recetas, setStock, showToast, stock],
  );

  const registrarMovimientoInsumo = useCallback(
    async (insumo_id, tipo, cantidad, valor) => {
      const delta = tipo === "ingreso" ? cantidad : -cantidad;
      let nuevo;
      let previo;
      setInsumoStock((prev) => {
        const actual = prev[insumo_id] ?? 0;
        previo = actual;
        nuevo = Math.max(0, actual + delta);
        return { ...prev, [insumo_id]: nuevo };
      });
      const { error: errStock } = await supabase
        .from("insumo_stock")
        .upsert(
          { insumo_id, cantidad: nuevo, updated_at: new Date().toISOString() },
          { onConflict: "insumo_id" },
        );
      if (errStock) {
        setInsumoStock((prev) => ({
          ...prev,
          [insumo_id]: previo ?? (prev[insumo_id] ?? 0),
        }));
        throw errStock;
      }
      const { data: mov, error: errMov } = await supabase
        .from("insumo_movimientos")
        .insert({ insumo_id, tipo, cantidad, valor: valor || null })
        .select("id, insumo_id, tipo, cantidad, valor, created_at")
        .single();
      if (errMov) {
        setInsumoStock((prev) => ({
          ...prev,
          [insumo_id]: previo ?? (prev[insumo_id] ?? 0) - delta,
        }));
        await supabase
          .from("insumo_stock")
          .upsert(
            { insumo_id, cantidad: previo ?? 0, updated_at: new Date().toISOString() },
            { onConflict: "insumo_id" },
          );
        throw errMov;
      }
      if (mov) setInsumoMovimientos?.((prev) => [mov, ...prev]);
      if (tipo === "ingreso" && typeof navigator !== "undefined" && navigator.onLine) {
        notifyEvent("ingreso_mercaderia", {
          insumo_id,
          movimiento_id: mov?.id,
          cantidad,
        });
      }
    },
    [setInsumoMovimientos, setInsumoStock],
  );

  const consumirInsumosPorStock = useCallback(
    async (receta_id, cantidad) => {
      const receta = (recetas || []).find((r) => r.id === receta_id);
      if (!receta || !receta.rinde) return;
      const ings = (recetaIngredientes || []).filter(
        (i) => i.receta_id === receta_id && i.insumo_id,
      );

      const composicionPorInsumo = {};
      for (const c of insumoComposicion || []) {
        if (!composicionPorInsumo[c.insumo_id]) composicionPorInsumo[c.insumo_id] = [];
        composicionPorInsumo[c.insumo_id].push(c);
      }

      for (const ing of ings) {
        const insumo = (insumos || []).find((x) => x.id === ing.insumo_id);
        if (!insumo) continue;
        const cantPorUnidad = (parseFloat(ing.cantidad) || 0) / (receta.rinde || 1);
        const cantTotalIng = cantPorUnidad * cantidad;
        const cantGramos = aGramos(cantTotalIng, ing.unidad || "g");
        const componentes = composicionPorInsumo[ing.insumo_id];
        if (componentes && componentes.length > 0) {
          for (const comp of componentes) {
            const factor = parseFloat(comp.factor) || 0;
            if (factor <= 0) continue;
            const insumoHijo = (insumos || []).find(
              (x) => x.id === comp.insumo_id_componente,
            );
            if (!insumoHijo) continue;
            const cantHijoGramos = cantGramos * factor;
            const cantHijo = convertirAUnidadInsumo(
              cantHijoGramos,
              "g",
              insumoHijo.unidad || "g",
            );
            if (cantHijo > 0)
              await registrarMovimientoInsumo(comp.insumo_id_componente, "egreso", cantHijo);
          }
        } else {
          const cantEnUnidad = convertirAUnidadInsumo(
            cantTotalIng,
            ing.unidad || "g",
            insumo.unidad || "g",
          );
          if (cantEnUnidad > 0)
            await registrarMovimientoInsumo(ing.insumo_id, "egreso", cantEnUnidad);
        }
      }
    },
    [insumoComposicion, insumos, recetas, recetaIngredientes, registrarMovimientoInsumo],
  );

  return {
    actualizarStock,
    actualizarStockBatch,
    registrarMovimientoInsumo,
    consumirInsumosPorStock,
  };
}

