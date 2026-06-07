import { useCallback, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { deleteVentaPendiente, getVentasPendientes } from "../lib/offlineVentas";
import { notifyEvent } from "../lib/notifyEvent";
import { reportError } from "../utils/errorReport";

/**
 * Sincroniza ventas guardadas en IndexedDB (offline) cuando hay sesión y conexión.
 * Usado por App.js. Sube filas a Supabase, actualiza stock y borra pendientes; en error reporta y no borra.
 * @param {{ session, isOnline, actualizarStockBatch, deleteVentas, loadData, appendVentas, showToast }}
 */
export function useSyncVentasPendientes({
  session,
  isOnline,
  actualizarStockBatch,
  deleteVentas,
  loadData,
  appendVentas,
  showToast,
}) {
  const syncVentasPendientes = useCallback(async () => {
    if (!supabase || !isOnline) return;
    try {
      const pendientes = await getVentasPendientes();
      if (!pendientes || pendientes.length === 0) return;
      let totalLineasSincronizadas = 0;
      for (const item of pendientes) {
        const rows = Array.isArray(item.rows) ? item.rows : [];
        if (rows.length === 0) {
          await deleteVentaPendiente(item.id);
          continue;
        }
        try {
          let inserted = null;
          let { data, error } = await supabase.from("ventas").insert(rows).select("*");
          inserted = data;
          const sinTransaccion =
            error &&
            (error.message?.includes("transaccion_id") || error.code === "42703");
          if (sinTransaccion) {
            const res = await supabase
              .from("ventas")
              .insert(rows.map(({ transaccion_id, ...r }) => r))
              .select("*");
            inserted = res.data;
            error = res.error;
          }
          if (error) {
            console.error("[syncVentasPendientes/insertVentas]", error);
            throw error;
          }
          if (actualizarStockBatch) {
            try {
              const stockDeltas = rows
                .filter((v) => v.receta_id && (v.cantidad || 0) > 0)
                .map((v) => ({ receta_id: v.receta_id, delta: -(v.cantidad || 0) }));
              if (stockDeltas.length > 0) {
                await actualizarStockBatch(stockDeltas);
              }
            } catch (stockErr) {
              const ids = (inserted || []).map((r) => r.id).filter(Boolean);
              if (ids.length > 0 && deleteVentas) {
                try {
                  await deleteVentas(ids);
                } catch (rollbackErr) {
                  reportError(rollbackErr, { action: "rollbackSyncVentasAfterStockFail", ids });
                }
              }
              throw stockErr;
            }
          }
          await deleteVentaPendiente(item.id);
          totalLineasSincronizadas += rows.length;

          const ventaIds = (inserted || []).map((r) => r.id).filter(Boolean);
          const transaccionId = rows[0]?.transaccion_id || null;
          if (ventaIds.length || transaccionId) {
            notifyEvent("venta", {
              transaccion_id: transaccionId,
              venta_ids: ventaIds,
            }).catch(() => {});
          }
          if (appendVentas && inserted?.length) {
            appendVentas(inserted);
          }
        } catch (err) {
          reportError(err, { action: "syncVentasPendientes.item", id: item.id });
        }
      }
      if (totalLineasSincronizadas > 0) {
        showToast?.(`✅ Se sincronizaron ${totalLineasSincronizadas} ventas`);
        if (!appendVentas) {
          await loadData?.();
        }
      }
    } catch (err) {
      reportError(err, { action: "syncVentasPendientes" });
    }
  }, [actualizarStockBatch, appendVentas, deleteVentas, isOnline, loadData, showToast]);

  useEffect(() => {
    if (session && isOnline) {
      syncVentasPendientes();
    }
  }, [session, isOnline, syncVentasPendientes]);
}

