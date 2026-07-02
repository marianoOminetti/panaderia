import { useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

const SELECT_LEGACY =
  "transaccion_id, estado, cae, cae_vencimiento, punto_venta, numero_comprobante, importe_total, error_mensaje, receptor_cuit, receptor_razon_social, emisor_cuit, tipo_comprobante";

const SELECT_FULL = `${SELECT_LEGACY}, receptor_doc_tipo, receptor_doc_nro`;

/** Chunk máximo para el filtro .in() de PostgREST. */
const IN_CHUNK_SIZE = 200;

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
 * Lee facturas de varias transacciones (en chunks) con fallback de columnas.
 * `ok` es false si algún chunk falló, para poder reintentar más tarde.
 */
async function fetchFacturasIn(ids) {
  const out = [];
  let ok = true;
  for (let i = 0; i < ids.length; i += IN_CHUNK_SIZE) {
    const chunk = ids.slice(i, i + IN_CHUNK_SIZE);
    let { data, error } = await supabase
      .from("facturas_electronicas")
      .select(SELECT_FULL)
      .in("transaccion_id", chunk);

    if (error && /receptor_doc|schema cache/i.test(String(error.message || ""))) {
      ({ data, error } = await supabase
        .from("facturas_electronicas")
        .select(SELECT_LEGACY)
        .in("transaccion_id", chunk));
    }

    if (error) {
      console.error("[useFacturasElectronicas]", error);
      ok = false;
      continue;
    }
    if (data) out.push(...data);
  }
  return { rows: out, ok };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Mapa transaccion_id → registro fiscal (lectura vía RLS).
 * Se hidrata con hydrateFacturas(ids) al cargar/paginar ventas, y se refresca
 * puntualmente con refreshFacturas(id) al emitir/editar.
 */
export function useFacturasElectronicas() {
  const [facturasByTransaccion, setFacturasByTransaccion] = useState({});
  // ids ya consultados en esta sesión (con o sin factura) para no re-consultar.
  const hydratedIdsRef = useRef(new Set());

  /**
   * Carga en el mapa las facturas de las transacciones visibles que aún no se
   * consultaron. Mergea (no reemplaza) para no pisar emisiones recientes.
   */
  const hydrateFacturas = useCallback(async (transaccionIds) => {
    const nuevos = [...new Set((transaccionIds || []).filter(Boolean))].filter(
      (id) => !hydratedIdsRef.current.has(id),
    );
    if (!nuevos.length) return;

    const { rows, ok } = await fetchFacturasIn(nuevos);
    // Solo marcamos como consultados si la lectura fue exitosa; ante error de
    // red dejamos los ids libres para reintentar en el próximo cambio de ventas.
    if (ok) nuevos.forEach((id) => hydratedIdsRef.current.add(id));

    if (!rows.length) return;
    setFacturasByTransaccion((prev) => {
      const next = { ...prev };
      for (const row of rows) next[row.transaccion_id] = row;
      return next;
    });
  }, []);

  /**
   * @param {string} [transaccionId] si se pasa, refresca solo esa transacción.
   * @param {{retries?: number, delayMs?: number}} [opts] reintentos ante lectura
   *   vacía (read-after-write: la fila ya se escribió pero la réplica tarda).
   */
  const refreshFacturas = useCallback(async (transaccionId, opts = {}) => {
    if (transaccionId) {
      const { retries = 0, delayMs = 600 } = opts;
      let row = null;
      for (let intento = 0; intento <= retries; intento += 1) {
        row = await fetchFacturaRow(transaccionId);
        if (row) break;
        if (intento < retries) await sleep(delayMs);
      }
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

  return { facturasByTransaccion, refreshFacturas, hydrateFacturas };
}
