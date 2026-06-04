import {
  formatCuitDisplay,
  isValidCuit,
  maskCuit,
  normalizeCuitInput,
} from "./cuit";
import {
  AFIP_DOC_CONSUMIDOR_FINAL,
  AFIP_DOC_CUIT,
  AFIP_DOC_DNI,
} from "./afipQr";

/** Solo dígitos; hasta 11 (CUIT). */
export function normalizeDocumentoInput(value) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 11);
}

/**
 * Detecta CUIT (11 + DV), DNI (7–8) o consumidor final (vacío).
 * @returns {{ ok: true, tipo: 'cf'|'cuit'|'dni', doc_tipo: number, doc_nro: number, cuit: string|null, dni: string|null, etiqueta: string|null } | { ok: false, error: string }}
 */
export function detectAfipDocumento(input) {
  const digits = normalizeDocumentoInput(input);
  if (!digits) {
    return {
      ok: true,
      tipo: "cf",
      doc_tipo: AFIP_DOC_CONSUMIDOR_FINAL,
      doc_nro: 0,
      cuit: null,
      dni: null,
      etiqueta: null,
    };
  }
  if (digits.length === 11) {
    if (!isValidCuit(digits)) {
      return { ok: false, error: "CUIT inválido. Revisá los 11 dígitos." };
    }
    return {
      ok: true,
      tipo: "cuit",
      doc_tipo: AFIP_DOC_CUIT,
      doc_nro: Number(digits),
      cuit: digits,
      dni: null,
      etiqueta: "CUIT",
    };
  }
  if (digits.length >= 7 && digits.length <= 8) {
    return {
      ok: true,
      tipo: "dni",
      doc_tipo: AFIP_DOC_DNI,
      doc_nro: Number(digits),
      cuit: null,
      dni: digits,
      etiqueta: "DNI",
    };
  }
  if (digits.length < 7) {
    return {
      ok: false,
      error: "Ingresá al menos 7 dígitos (DNI) o 11 (CUIT).",
    };
  }
  return {
    ok: false,
    error: "Son 7–8 dígitos para DNI u 11 para CUIT.",
  };
}

export function maskDni(dni) {
  const s = normalizeDocumentoInput(dni).slice(0, 8);
  if (s.length < 4) return s;
  return `***${s.slice(-4)}`;
}

/** Texto para comprobante / listas según tipo guardado en factura. */
export function formatReceptorDocDisplay(factura) {
  const tipo = Number(factura?.receptor_doc_tipo);
  const nro =
    factura?.receptor_doc_nro != null && factura.receptor_doc_nro !== ""
      ? String(factura.receptor_doc_nro).replace(/\D/g, "")
      : "";
  if (tipo === AFIP_DOC_DNI && nro) {
    return { etiqueta: "DNI", display: nro };
  }
  const cuit = normalizeCuitInput(factura?.receptor_cuit);
  if (cuit.length === 11 && isValidCuit(cuit)) {
    return { etiqueta: "CUIT", display: formatCuitDisplay(cuit) };
  }
  if (nro && tipo === AFIP_DOC_CUIT) {
    return { etiqueta: "CUIT", display: formatCuitDisplay(nro) };
  }
  return { etiqueta: null, display: null };
}

export function formatReceptorDocLabel(razon, factura) {
  const doc = formatReceptorDocDisplay(factura);
  if (doc.etiqueta === "CUIT") {
    return `${razon} (CUIT ${maskCuit(doc.display)})`;
  }
  if (doc.etiqueta === "DNI") {
    return `${razon} (DNI ${maskDni(doc.display)})`;
  }
  return razon;
}
