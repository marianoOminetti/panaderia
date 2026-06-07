import { useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

const SELECT_LEGACY =
  "transaccion_id, estado, cae, cae_vencimiento, punto_venta, numero_comprobante, importe_total, error_mensaje, receptor_cuit, receptor_razon_social, emisor_cuit, tipo_comprobante";

const SELECT_FULL = `${SELECT_LEGACY}, receptor_doc_tipo, receptor_doc_nro`;

async function fetchFacturaRow(transaccionId) {
  let { data, error } = await supabase
    .from("facturas_electronicas")
    .select(SELECT_FULL)
    .eq("transaccion_id", transaccionId)
    .maybeSingle();

  if (error && /receptor_doc|schema cache/i.test(String(error.message || ""))) {
    ({ data, error } = await supabase
      .from("facturas_electronicas")
      .select(SELECT_LEGACY)
      .eq("transaccion_id", transaccionId)
      .maybeSingle());
  }

  if (error) {
    console.error("[useFacturasElectronicas]", error);
    return null;
  }
  return data || null;
}

/**
 * Mapa transaccion_id → registro fiscal (lectura vía RLS).
 * Sin enabled: no carga al montar; usar refreshFacturas(transaccionId) on-demand.
 */
export function useFacturasElectronicas() {
  const [facturasByTransaccion, setFacturasByTransaccion] = useState({});

  const refreshFacturas = useCallback(async (transaccionId) => {
    if (transaccionId) {
      const row = await fetchFacturaRow(transaccionId);
      if (row) {
        setFacturasByTransaccion((prev) => ({
          ...prev,
          [transaccionId]: row,
        }));
      }
      return row;
    }

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
      return null;
    }
    const map = {};
    for (const row of data || []) {
      map[row.transaccion_id] = row;
    }
    setFacturasByTransaccion(map);
    return map;
  }, []);

  return { facturasByTransaccion, refreshFacturas };
}
