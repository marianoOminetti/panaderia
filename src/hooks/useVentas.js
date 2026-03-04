import { useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Mutaciones de ventas. No incluye actualizarStock; el componente debe llamarlo.
 * insertVentas devuelve los ids insertados para poder hacer rollback si falla el stock.
 */
export function useVentas() {
  const insertVentas = useCallback(async (rows) => {
    let { data, error } = await supabase.from("ventas").insert(rows).select("id");
    const sinTransaccion =
      error &&
      (error.message?.includes("transaccion_id") || error.code === "42703");
    if (sinTransaccion) {
      const res = await supabase
        .from("ventas")
        .insert(rows.map(({ transaccion_id, ...r }) => r))
        .select("id");
      data = res.data;
      error = res.error;
    }
    if (error) throw error;
    return data || [];
  }, []);

  const deleteVentas = useCallback(async (ids) => {
    const { error } = await supabase.from("ventas").delete().in("id", ids);
    if (error) throw error;
  }, []);

  const updateVenta = useCallback(async (id, payload) => {
    const { error } = await supabase
      .from("ventas")
      .update(payload)
      .eq("id", id);
    if (error) throw error;
  }, []);

  return { insertVentas, deleteVentas, updateVenta };
}
