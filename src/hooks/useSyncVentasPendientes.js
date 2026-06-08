import { useCallback, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  deleteVentaPendiente,
  getVentasPendientes,
  markVentaPendienteSyncing,
} from "../lib/offlineVentas";
import { notifyEvent } from "../lib/notifyEvent";
import { reportError } from "../utils/errorReport";
import { enqueueVentaWrite } from "../lib/ventaWriteQueue";
import { releaseVentaTransaccionClaim } from "./useVentas";

/**
 * Sincroniza ventas guardadas en IndexedDB (offline) cuando hay sesión y conexión.
 * Usado por App.js. Sube filas a Supabase, actualiza stock y borra pendientes; en error reporta y no borra.
 * @param {{ session, isOnline, actualizarStockBatch, deleteVentas, insertVentas, loadData, resolveOptimisticVentas, showToast }}
 */
export function useSyncVentasPendientes({
  session,
  isOnline,
  actualizarStockBatch,
  deleteVentas,
  insertVentas,
  loadData,
  resolveOptimisticVentas,
  showToast,
}) {
  const syncInFlightRef = useRef(false);

  const syncVentasPendientes = useCallback(async () => {
    if (!supabase || !isOnline || syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    try {
      await enqueueVentaWrite(async () => {
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
            await markVentaPendienteSyncing(item.id);
            const transaccionId = rows[0]?.transaccion_id || null;
            const syncStartedAt = Date.now();
            let inserted = await insertVentas(rows, { source: "offline_sync" });
            if (transaccionId && (!inserted || inserted.length === 0)) {
              await releaseVentaTransaccionClaim(transaccionId);
              inserted = await insertVentas(rows, { source: "offline_sync" });
            }
            if (transaccionId && (!inserted || inserted.length === 0)) {
              throw new Error("Sync venta: sin filas tras reintento idempotente");
            }
            const isIdempotentReplay =
              transaccionId &&
              inserted?.length > 0 &&
              inserted.every(
                (r) =>
                  r.created_at &&
                  new Date(r.created_at).getTime() < syncStartedAt - 2000,
              );
            if (!isIdempotentReplay && actualizarStockBatch) {
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
                if (transaccionId) {
                  await releaseVentaTransaccionClaim(transaccionId);
                }
                throw stockErr;
              }
            }
            await deleteVentaPendiente(item.id);
            totalLineasSincronizadas += rows.length;

            const ventaIds = (inserted || []).map((r) => r.id).filter(Boolean);
            if (ventaIds.length || transaccionId) {
              notifyEvent("venta", {
                transaccion_id: transaccionId,
                venta_ids: ventaIds,
              }).catch(() => {});
            }
            if (resolveOptimisticVentas && transaccionId) {
              const pendingIds = rows.map(
                (_, i) => `pending-${transaccionId}-${i}`,
              );
              resolveOptimisticVentas(transaccionId, inserted || [], pendingIds);
            } else if (inserted?.length && resolveOptimisticVentas) {
              const txFromInsert = inserted[0]?.transaccion_id;
              if (txFromInsert) {
                resolveOptimisticVentas(txFromInsert, inserted, []);
              }
            }
          } catch (err) {
            reportError(err, { action: "syncVentasPendientes.item", id: item.id });
          }
        }
        if (totalLineasSincronizadas > 0) {
          showToast?.(`✅ Se sincronizaron ${totalLineasSincronizadas} ventas`);
          if (!resolveOptimisticVentas) {
            await loadData?.();
          }
        }
      });
    } catch (err) {
      reportError(err, { action: "syncVentasPendientes" });
    } finally {
      syncInFlightRef.current = false;
    }
  }, [
    actualizarStockBatch,
    deleteVentas,
    insertVentas,
    isOnline,
    loadData,
    resolveOptimisticVentas,
    showToast,
  ]);

  useEffect(() => {
    if (session && isOnline) {
      syncVentasPendientes();
    }
  }, [session, isOnline, syncVentasPendientes]);

  return { syncVentasPendientes };
}
