import { isValidCuit, normalizeCuitInput } from "./cuit";

/**
 * Valida y arma payload receptor para registrar-en-afip.
 * @returns {{ ok: true, receptor: { cuit: string|null, razon_social: string } } | { ok: false, error: string }}
 */
export function buildAfipReceptorPayload(datosFiscales, clienteSel, clientes) {
  const cliente = (clientes || []).find((c) => c.id === clienteSel);
  const cuitRaw = normalizeCuitInput(datosFiscales?.cuit || cliente?.cuit);
  const razonPanel = (datosFiscales?.razon_social ?? "").trim();

  const razon =
    razonPanel ||
    (cliente?.razon_social ?? "").trim() ||
    (cliente?.nombre ?? "").trim() ||
    "";

  if (cuitRaw.length > 0) {
    if (!isValidCuit(cuitRaw)) {
      return { ok: false, error: "CUIT inválido. Revisá los 11 dígitos." };
    }
    if (!razon) {
      return {
        ok: false,
        error: "Si cargás CUIT, completá la razón social como figura en AFIP.",
      };
    }
    return {
      ok: true,
      receptor: { cuit: cuitRaw, razon_social: razon },
    };
  }

  if (razon) {
    return {
      ok: true,
      receptor: { cuit: null, razon_social: razon },
    };
  }

  return {
    ok: true,
    receptor: { cuit: null, razon_social: "Consumidor Final" },
  };
}

/** Receptor para reintento AFIP desde snapshot o ficha del cliente de la venta. */
export function buildAfipReceptorForRetry(transaccionId, facturasByTransaccion, ventas, clientes) {
  const factura = facturasByTransaccion?.[transaccionId];
  if (factura?.receptor_cuit || factura?.receptor_razon_social) {
    return {
      cuit: factura.receptor_cuit || null,
      razon_social: factura.receptor_razon_social || "Consumidor Final",
    };
  }
  const venta = (ventas || []).find(
    (v) => v.transaccion_id === transaccionId && v.cliente_id,
  );
  if (!venta?.cliente_id) return null;
  const cliente = (clientes || []).find((c) => c.id === venta.cliente_id);
  const built = buildAfipReceptorPayload(
    afipReceptorFromCliente(cliente),
    venta.cliente_id,
    clientes,
  );
  return built.ok ? built.receptor : null;
}

/** Si conviene guardar CUIT/razón en la ficha del cliente. */
export function shouldPersistClienteFiscal(receptor) {
  if (!receptor) return false;
  if (receptor.cuit) return true;
  const razon = (receptor.razon_social || "").trim();
  return razon.length > 0 && razon !== "Consumidor Final";
}

/** Prefill del panel AFIP desde ficha de cliente. */
export function afipReceptorFromCliente(cliente) {
  if (!cliente) return { cuit: "", razon_social: "" };
  return {
    cuit: normalizeCuitInput(cliente.cuit),
    razon_social: (cliente.razon_social || cliente.nombre || "").trim(),
  };
}
