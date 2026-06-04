/**
 * QR oficial AFIP/ARCA (RG 4892/2020) para comprobantes emitidos vía Web Services.
 * @see https://www.afip.gob.ar/fe/qr/documentos/QRespecificaciones.pdf
 */

import { normalizeCuitInput } from "./cuit";

export const AFIP_QR_BASE_URL = "https://www.afip.gob.ar/fe/qr/";

/** DocTipo AFIP (WSFE) */
export const AFIP_DOC_CONSUMIDOR_FINAL = 99;
export const AFIP_DOC_CUIT = 80;
export const AFIP_DOC_DNI = 96;

/** CbteTipo FACTURA_C */
export const AFIP_TIPO_FACTURA_C = 11;

function fechaToIso(fecha) {
  if (!fecha) return "";
  const s = String(fecha).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  try {
    return new Date(s.length <= 10 ? `${s}T12:00:00` : s)
      .toISOString()
      .slice(0, 10);
  } catch {
    return s;
  }
}

function caeToCodAut(cae) {
  const digits = String(cae ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return Number(digits.slice(0, 14));
}

/**
 * Arma la URL del QR (JSON v1 en Base64).
 * @returns {string|null} null si faltan datos obligatorios
 */
export function buildAfipQrUrl({
  fecha,
  cuitEmisor,
  ptoVta,
  tipoCmp = AFIP_TIPO_FACTURA_C,
  nroCmp,
  importe,
  tipoDocRec = AFIP_DOC_CONSUMIDOR_FINAL,
  nroDocRec = 0,
  cae,
  moneda = "PES",
  ctz = 1,
}) {
  const cuitNum = Number(normalizeCuitInput(cuitEmisor));
  const codAut = caeToCodAut(cae);
  const pv = Number(ptoVta);
  const nro = Number(nroCmp);
  const imp = Number(importe);
  const f = fechaToIso(fecha);

  if (!cuitNum || !f || !pv || !nro || !imp || !codAut) {
    return null;
  }

  const payload = {
    ver: 1,
    fecha: f,
    cuit: cuitNum,
    ptoVta: pv,
    tipoCmp: Number(tipoCmp),
    nroCmp: nro,
    importe: Math.round(imp * 100) / 100,
    moneda,
    ctz: Number(ctz) || 1,
    tipoDocRec: Number(tipoDocRec),
    nroDocRec: Number(nroDocRec) || 0,
    tipoCodAut: "E",
    codAut,
  };

  const json = JSON.stringify(payload);
  const b64 = btoa(json);

  return `${AFIP_QR_BASE_URL}?p=${b64}`;
}

/** CUIT emisor desde env del front (mismo negocio que AFIP_CUIT en Edge). */
export function getAfipCuitEmisor() {
  const raw = process.env.REACT_APP_AFIP_CUIT || "";
  const n = normalizeCuitInput(raw);
  return n.length === 11 ? n : null;
}

/** CUIT emisor guardado al emitir, o fallback a env del build. */
export function resolveEmisorCuit(factura) {
  const fromDb = normalizeCuitInput(factura?.emisor_cuit || "");
  if (fromDb.length === 11) return fromDb;
  return getAfipCuitEmisor();
}
