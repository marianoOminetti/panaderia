import { detectAfipDocumento, normalizeDocumentoInput } from "./afipDocumento";
import { AFIP_DOC_DNI } from "./afipQr";

/** Documento para prefill del panel desde factura emitida. */
export function documentoFromFactura(factura) {
  if (!factura) return "";
  if (Number(factura.receptor_doc_tipo) === AFIP_DOC_DNI && factura.receptor_doc_nro) {
    return String(factura.receptor_doc_nro).replace(/\D/g, "");
  }
  return normalizeDocumentoInput(factura.receptor_cuit || "");
}

/**
 * Valida y arma payload receptor para registrar-en-afip.
 * @returns {{ ok: true, receptor: object } | { ok: false, error: string }}
 */
export function buildAfipReceptorPayload(datosFiscales, clienteSel, clientes) {
  const cliente = (clientes || []).find((c) => c.id === clienteSel);
  const docPanel = normalizeDocumentoInput(
    datosFiscales?.documento ?? datosFiscales?.cuit ?? "",
  );
  const docCliente = normalizeDocumentoInput(cliente?.cuit || cliente?.dni || "");
  const docRaw = docPanel || docCliente;
  const razonPanel = (datosFiscales?.razon_social ?? "").trim();
  const razon =
    razonPanel ||
    (cliente?.razon_social ?? "").trim() ||
    (cliente?.nombre ?? "").trim() ||
    "";

  const detected = detectAfipDocumento(docRaw);
  if (!detected.ok) {
    return { ok: false, error: detected.error };
  }

  if (detected.tipo === "cf") {
    if (razon) {
      return {
        ok: true,
        receptor: {
          cuit: null,
          dni: null,
          doc_tipo: detected.doc_tipo,
          doc_nro: detected.doc_nro,
          razon_social: razon,
        },
      };
    }
    return {
      ok: true,
      receptor: {
        cuit: null,
        dni: null,
        doc_tipo: detected.doc_tipo,
        doc_nro: 0,
        razon_social: "Consumidor Final",
      },
    };
  }

  if (!razon) {
    return {
      ok: false,
      error:
        detected.tipo === "dni"
          ? "Si cargás DNI, completá nombre o razón social del titular."
          : "Si cargás CUIT, completá la razón social como figura en AFIP.",
    };
  }

  return {
    ok: true,
    receptor: {
      cuit: detected.cuit,
      dni: detected.dni,
      doc_tipo: detected.doc_tipo,
      doc_nro: detected.doc_nro,
      razon_social: razon,
    },
  };
}

function receptorFromFacturaSnapshot(factura) {
  const tipo = factura.receptor_doc_tipo != null ? Number(factura.receptor_doc_tipo) : null;
  const nroRaw = factura.receptor_doc_nro ?? factura.receptor_cuit ?? "";
  const detected = detectAfipDocumento(
    tipo === AFIP_DOC_DNI ? String(nroRaw) : normalizeDocumentoInput(nroRaw),
  );
  if (!detected.ok) {
    return {
      cuit: factura.receptor_cuit || null,
      dni: null,
      doc_tipo: 99,
      doc_nro: 0,
      razon_social: factura.receptor_razon_social || "Consumidor Final",
    };
  }
  return {
    cuit: detected.cuit,
    dni: detected.dni,
    doc_tipo: detected.doc_tipo,
    doc_nro: detected.doc_nro,
    razon_social: factura.receptor_razon_social || "Consumidor Final",
  };
}

/** Receptor para reintento AFIP desde snapshot o ficha del cliente de la venta. */
export function buildAfipReceptorForRetry(transaccionId, facturasByTransaccion, ventas, clientes) {
  const factura = facturasByTransaccion?.[transaccionId];
  if (
    factura?.receptor_cuit ||
    factura?.receptor_doc_nro ||
    factura?.receptor_razon_social
  ) {
    return receptorFromFacturaSnapshot(factura);
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

/** Si conviene guardar documento/razón en la ficha del cliente. */
export function shouldPersistClienteFiscal(receptor) {
  if (!receptor) return false;
  if (receptor.cuit || receptor.dni) return true;
  const razon = (receptor.razon_social || "").trim();
  return razon.length > 0 && razon !== "Consumidor Final";
}

/** Prefill del panel AFIP desde ficha de cliente. */
export function afipReceptorFromCliente(cliente) {
  if (!cliente) return { documento: "", razon_social: "" };
  const documento = normalizeDocumentoInput(
    cliente.dni || cliente.cuit || "",
  );
  return {
    documento,
    razon_social: (cliente.razon_social || cliente.nombre || "").trim(),
  };
}
