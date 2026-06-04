import { useState, useCallback, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

const SELECT_LEGACY =
  "transaccion_id, estado, cae, cae_vencimiento, punto_venta, numero_comprobante, importe_total, error_mensaje, receptor_cuit, receptor_razon_social, emisor_cuit, tipo_comprobante";

const SELECT_FULL = `${SELECT_LEGACY}, receptor_doc_tipo, receptor_doc_nro`;

/**
 * Mapa transaccion_id → registro fiscal (lectura vía RLS).
 */
export function useFacturasElectronicas({ enabled = true } = {}) {
  const [facturasByTransaccion, setFacturasByTransaccion] = useState({});

  const refreshFacturas = useCallback(async () => {
    let { data, error } = await supabase
      .from("facturas_electronicas")
      .select(SELECT_FULL);

    if (error && /receptor_doc|schema cache/i.test(String(error.message || ""))) {
      ({ data, error } = await supabase
        .from("facturas_electronicas")
        .select(SELECT_LEGACY));
    }

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
