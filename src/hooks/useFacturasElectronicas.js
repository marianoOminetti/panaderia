import { useState, useCallback, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Mapa transaccion_id → registro fiscal (lectura vía RLS).
 */
export function useFacturasElectronicas({ enabled = true } = {}) {
  const [facturasByTransaccion, setFacturasByTransaccion] = useState({});

  const refreshFacturas = useCallback(async () => {
    const { data, error } = await supabase
      .from("facturas_electronicas")
      .select(
        "transaccion_id, estado, cae, cae_vencimiento, punto_venta, numero_comprobante, importe_total, error_mensaje",
      );
    if (error) {
      console.error("[useFacturasElectronicas]", error);
      return;
    }
    const map = {};
    for (const row of data || []) {
      map[row.transaccion_id] = row;
    }
    setFacturasByTransaccion(map);
  }, []);

  useEffect(() => {
    if (enabled) refreshFacturas();
  }, [enabled, refreshFacturas]);

  return { facturasByTransaccion, refreshFacturas };
}
