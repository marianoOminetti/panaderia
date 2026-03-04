import { useCallback, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { deleteVentaPendiente, getVentasPendientes } from "../lib/offlineVentas";
import { reportError } from "../utils/errorReport";

export function useSyncVentasPendientes({
  session,
  isOnline,
  actualizarStock,
  deleteVentas,
  loadData,
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
          let { data, error } = await supabase.from("ventas").insert(rows).select("id");
          inserted = data;
          const sinTransaccion =
            error &&
            (error.message?.includes("transaccion_id") || error.code === "42703");
          if (sinTransaccion) {
            const res = await supabase
              .from("ventas")
              .insert(rows.map(({ transaccion_id, ...r }) => r))
              .select("id");
            inserted = res.data;
            error = res.error;
          }
          if (error) throw error;
          if (actualizarStock) {
            try {
              for (const v of rows) {
                const cant = v.cantidad || 0;
                if (!v.receta_id || cant <= 0) continue;
                await actualizarStock(v.receta_id, -cant);
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
        } catch (err) {
          reportError(err, { action: "syncVentasPendientes.item", id: item.id });
        }
      }
      if (totalLineasSincronizadas > 0) {
        showToast?.(`✅ Se sincronizaron ${totalLineasSincronizadas} ventas`);
        await loadData?.();
      }
    } catch (err) {
      reportError(err, { action: "syncVentasPendientes" });
    }
  }, [actualizarStock, deleteVentas, isOnline, loadData, showToast]);

  useEffect(() => {
    if (session && isOnline) {
      syncVentasPendientes();
    }
  }, [session, isOnline, syncVentasPendientes]);
}

