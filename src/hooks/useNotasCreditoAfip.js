import { useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

const SELECT_NC =
  "transaccion_id, estado, cae, cae_vencimiento, punto_venta, numero_comprobante, importe_total, error_mensaje, emisor_cuit, tipo_comprobante, factura_punto_venta, factura_numero, factura_tipo, factura_fecha, receptor_cuit, receptor_razon_social, receptor_doc_tipo, receptor_doc_nro";

const IN_CHUNK_SIZE = 200;

async function fetchNotaCreditoRow(transaccionId) {
  const { data, error } = await supabase
    .from("notas_credito_afip")
    .select(SELECT_NC)
    .eq("transaccion_id", transaccionId)
    .maybeSingle();

  if (error) {
    if (/notas_credito_afip|schema cache/i.test(String(error.message || ""))) {
      return null;
    }
    console.error("[useNotasCreditoAfip]", error);
    return null;
  }
  return data || null;
}

async function fetchNotasCreditoIn(ids) {
  const out = [];
  let ok = true;
  for (let i = 0; i < ids.length; i += IN_CHUNK_SIZE) {
    const chunk = ids.slice(i, i + IN_CHUNK_SIZE);
    const { data, error } = await supabase
      .from("notas_credito_afip")
      .select(SELECT_NC)
      .in("transaccion_id", chunk);

    if (error) {
      if (/notas_credito_afip|schema cache/i.test(String(error.message || ""))) {
        return { rows: [], ok: false };
      }
      console.error("[useNotasCreditoAfip]", error);
      ok = false;
      continue;
    }
    if (data) out.push(...data);
  }
  return { rows: out, ok };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function useNotasCreditoAfip() {
  const [notasCreditoByTransaccion, setNotasCreditoByTransaccion] = useState({});
  const hydratedIdsRef = useRef(new Set());

  const hydrateNotasCredito = useCallback(async (transaccionIds) => {
    const nuevos = [...new Set((transaccionIds || []).filter(Boolean))].filter(
      (id) => !hydratedIdsRef.current.has(id),
    );
    if (!nuevos.length) return;

    const { rows, ok } = await fetchNotasCreditoIn(nuevos);
    if (ok) nuevos.forEach((id) => hydratedIdsRef.current.add(id));

    if (!rows.length) return;
    setNotasCreditoByTransaccion((prev) => {
      const next = { ...prev };
      for (const row of rows) next[row.transaccion_id] = row;
      return next;
    });
  }, []);

  const refreshNotaCredito = useCallback(async (transaccionId, opts = {}) => {
    if (!transaccionId) return null;
    const { retries = 0, delayMs = 600 } = opts;
    let row = null;
    for (let intento = 0; intento <= retries; intento += 1) {
      row = await fetchNotaCreditoRow(transaccionId);
      if (row) break;
      if (intento < retries) await sleep(delayMs);
    }
    if (row) {
      setNotasCreditoByTransaccion((prev) => ({
        ...prev,
        [transaccionId]: row,
      }));
    }
    return row;
  }, []);

  return {
    notasCreditoByTransaccion,
    hydrateNotasCredito,
    refreshNotaCredito,
  };
}
