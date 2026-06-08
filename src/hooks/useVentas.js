import { useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { isPendingVentaId } from "../lib/ventas";

function isRpcMissing(error) {
  if (!error) return false;
  const code = error.code || "";
  const msg = String(error.message || "");
  return (
    code === "42883" ||
    code === "PGRST202" ||
    msg.includes("insert_ventas_idempotente") ||
    msg.includes("Could not find the function")
  );
}

export async function releaseVentaTransaccionClaim(transaccionId) {
  if (!transaccionId) return;
  const { error } = await supabase
    .from("venta_transacciones")
    .delete()
    .eq("transaccion_id", transaccionId);
  if (error && error.code !== "42P01" && !error.message?.includes("venta_transacciones")) {
    console.error("[ventas/releaseVentaTransaccionClaim]", error);
  }
}

async function insertVentasDirect(rows) {
  let { data, error } = await supabase.from("ventas").insert(rows).select("*");
  const sinTransaccion =
    error &&
    (error.message?.includes("transaccion_id") || error.code === "42703");
  if (sinTransaccion) {
    const res = await supabase
      .from("ventas")
      .insert(rows.map(({ transaccion_id, ...r }) => r))
      .select("*");
    data = res.data;
    error = res.error;
  }
  if (error) {
    console.error("[ventas/insertVentas]", error);
    throw error;
  }
  return data || [];
}

/**
 * Mutaciones de ventas. No incluye actualizarStock; el componente debe llamarlo.
 * insertVentas devuelve los ids insertados para poder hacer rollback si falla el stock.
 */
export function useVentas() {
  const insertVentas = useCallback(async (rows, { source = "online" } = {}) => {
    const txId = rows?.[0]?.transaccion_id;
    if (txId) {
      const { data, error } = await supabase.rpc("insert_ventas_idempotente", {
        p_rows: rows,
        p_source: source,
      });
      if (!error) return data || [];
      if (!isRpcMissing(error)) {
        console.error("[ventas/insertVentas/rpc]", error);
        throw error;
      }
    }
    return insertVentasDirect(rows);
  }, []);

  const deleteVentas = useCallback(async (ids) => {
    const realIds = (ids || []).filter((id) => id && !isPendingVentaId(id));
    if (realIds.length === 0) return;
    const { error } = await supabase.from("ventas").delete().in("id", realIds);
    if (error) {
      console.error("[ventas/deleteVentas]", error);
      throw error;
    }
  }, []);

  const updateVenta = useCallback(async (id, payload) => {
    if (isPendingVentaId(id)) {
      throw new Error("Esperá a que termine de guardarse la venta");
    }
    let { error } = await supabase.from("ventas").update(payload).eq("id", id);
    if (error?.code === "42703") {
      const strip = (keys, obj) => {
        const next = { ...obj };
        for (const k of keys) delete next[k];
        return next;
      };
      const attempts = [
        strip(["transaccion_id"], payload),
        strip(["subtotal", "descuento", "total_final", "promocion_id"], payload),
        strip(["transaccion_id", "subtotal", "descuento", "total_final", "promocion_id"], payload),
      ];
      for (const p of attempts) {
        if (Object.keys(p).length === 0) break;
        const res = await supabase.from("ventas").update(p).eq("id", id);
        if (!res.error) return;
        error = res.error;
        if (error.code !== "42703") break;
      }
    }
    if (error) {
      console.error("[ventas/updateVenta]", error);
      throw error;
    }
  }, []);

  const rollbackInsertVentas = useCallback(async (inserted, transaccionId) => {
    const ids = (inserted || []).map((r) => r.id).filter(Boolean);
    if (ids.length > 0) await deleteVentas(ids);
    if (transaccionId) await releaseVentaTransaccionClaim(transaccionId);
  }, [deleteVentas]);

  return { insertVentas, deleteVentas, updateVenta, rollbackInsertVentas, releaseVentaTransaccionClaim };
}
