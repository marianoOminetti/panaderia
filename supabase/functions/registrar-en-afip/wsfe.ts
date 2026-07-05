/**
 * Emisión directa vía Web Services AFIP (WSAA + WSFE) con certificado ARCA.
 * @ramiidv/arca-facturacion omite SOAPAction en WSAA; AFIP exige urn:LoginCms.
 */

import {
  Arca,
  ArcaError,
  ArcaSoapError,
  CbteTipo,
} from "npm:@ramiidv/arca-facturacion@2.0.0";
import type { ReceptorFiscal } from "./receptor.ts";

const WSAA_SOAP_ACTION = "urn:LoginCms";

type VentaRow = {
  cantidad: number;
  precio_unitario: number;
  subtotal: number | null;
  total_final: number | null;
  recetas: { nombre: string } | null;
};

export type WsfeEmitResult = {
  ok: boolean;
  cae?: string;
  cae_vencimiento?: string;
  tipo_comprobante?: number;
  punto_venta?: number;
  numero_comprobante?: number;
  importe_total: number;
  error?: string;
  /** true si el CAE se recuperó por reconciliación (no se re-emitió). */
  reconciliado?: boolean;
};

/** Ventana de números a escanear hacia atrás al reconciliar. */
const RECONCILIACION_MAX_SCAN = 25;

function installAfipFetchPatch(): void {
  const g = globalThis as typeof globalThis & { __panaderiaAfipFetchPatched?: boolean };
  if (g.__panaderiaAfipFetchPatched) return;
  g.__panaderiaAfipFetchPatched = true;
  const origFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (url.includes("LoginCms")) {
      const headers = new Headers(init?.headers);
      if (!headers.has("SOAPAction")) {
        headers.set("SOAPAction", WSAA_SOAP_ACTION);
      }
      return origFetch(input, { ...init, headers });
    }
    return origFetch(input, init);
  };
}

installAfipFetchPatch();

function decodePem(envB64: string | undefined, envPlain: string | undefined): string | null {
  if (envPlain?.includes("BEGIN")) return envPlain.replace(/\\n/g, "\n");
  if (!envB64) return null;
  try {
    return atob(envB64.replace(/\s/g, ""));
  } catch {
    return null;
  }
}

function caeVencimientoToIso(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const s = String(v).replace(/\D/g, "");
  if (s.length === 8) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }
  return v;
}

function humanizeAfipError(msg: string, puntoVenta: number): string {
  if (/INCONVENIENTES CON EL DOMICILIO FISCAL|domicilio fiscal/i.test(msg)) {
    return (
      "AFIP rechazó la factura: hay un problema con el domicilio fiscal de la CUIT " +
      "(código 10000-03). En ARCA revisá domicilio fiscal, Domicilio Fiscal Electrónico (DFE) " +
      "y, si te lo piden, presentá el formulario F183 en tu dependencia. " +
      "Cuando AFIP lo regularice, reintentá con el botón AFIP en la venta."
    );
  }
  if (/Request failed with status code 401|access_token/i.test(msg)) {
    return (
      "Error antiguo de configuración (401). Reintentá con el botón AFIP en la venta; " +
      "si persiste, avisá para redesplegar la función."
    );
  }
  if (/punto de venta no se encuentra habilitado|FEParamGetPtosVenta|11002/i.test(msg)) {
    return (
      `El punto de venta ${puntoVenta} no está habilitado en AFIP para facturación electrónica. ` +
      "En ARCA → Comprobantes en línea → ABM Puntos de ventas: creá o habilitá el PV y actualizá el secret AFIP_PUNTO_VENTA."
    );
  }
  if (/WSAA|login falló|NoSOAPAction|SOAPAction/i.test(msg)) {
    return (
      "No se pudo autenticar con AFIP (WSAA). Revisá certificado vinculado a WSFE y AFIP_PRODUCTION. " +
      msg.slice(0, 200)
    );
  }
  return msg.slice(0, 500);
}

function buildArca(): Arca | { error: string } {
  const cuit = parseInt(Deno.env.get("AFIP_CUIT") || "", 10);
  const cert = decodePem(
    Deno.env.get("AFIP_CERT_B64"),
    Deno.env.get("AFIP_CERT"),
  );
  const key = decodePem(
    Deno.env.get("AFIP_KEY_B64"),
    Deno.env.get("AFIP_KEY"),
  );
  const production = Deno.env.get("AFIP_PRODUCTION") === "true";

  if (!cuit || !cert || !key) {
    return {
      error: "Faltan AFIP_CUIT y certificado/clave (AFIP_CERT_B64 + AFIP_KEY_B64)",
    };
  }

  return new Arca({
    cuit,
    cert,
    key,
    production,
    // Sin reintentos internos: la reconciliación la manejamos nosotros para no
    // arriesgar una doble solicitud de CAE ante un error transitorio.
    retries: 0,
    onEvent: (e) => {
      if (e.type === "request:error" || e.type === "soap:fault") {
        console.error("[wsfe/arca]", e.type, JSON.stringify(e).slice(0, 600));
      }
    },
  });
}

/**
 * Solo reconciliamos ante errores de transporte (HTTP/timeout/SOAP fault),
 * donde AFIP PUDO haber autorizado aunque perdimos la respuesta. Ante errores
 * de negocio/auth/validación (ArcaWSFEError, ArcaAuthError, etc.) AFIP NO
 * autorizó, así que no tiene sentido reconciliar y evitamos falsos positivos.
 */
function debeReconciliar(err: unknown): boolean {
  if (err instanceof ArcaSoapError) return true;
  if (err instanceof ArcaError) return false;
  return true; // error desconocido: por seguridad, verificamos contra AFIP
}

/** Reintenta una consulta read-only (idempotente) ante blips de red. */
async function conReintentos<T>(
  fn: () => Promise<T>,
  intentos = 3,
  delayMs = 400,
): Promise<T> {
  let ultimoError: unknown;
  for (let i = 0; i < intentos; i++) {
    try {
      return await fn();
    } catch (err) {
      ultimoError = err;
      if (i < intentos - 1) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw ultimoError;
}

/** ¿El comprobante consultado en AFIP corresponde a esta emisión? */
function comprobanteCoincide(
  g: Record<string, unknown> | null | undefined,
  impTotal: number,
  receptor: ReceptorFiscal,
  fechasValidas: string[],
): boolean {
  if (!g) return false;
  if (g.Resultado !== "A") return false;
  if (!g.CodAutorizacion) return false;
  const impOk = Math.abs(Number(g.ImpTotal) - impTotal) < 0.01;
  const docOk =
    Number(g.DocNro) === Number(receptor.doc_nro) &&
    Number(g.DocTipo) === Number(receptor.doc_tipo);
  const fechaOk = fechasValidas.includes(String(g.CbteFch));
  return impOk && docOk && fechaOk;
}

function ymd(date: Date): string {
  return Arca.formatDate(date);
}

/**
 * Tras un fallo de transporte al emitir, AFIP pudo haber autorizado el CAE
 * aunque perdimos la respuesta. Escanea los comprobantes autorizados después
 * de `ultimoAntes` buscando uno que coincida (importe + documento + fecha).
 *
 * SEGURIDAD ANTI FALSO-POSITIVO: solo reconcilia si encuentra EXACTAMENTE UN
 * candidato que coincide. Si hay 0 o ≥2 (p. ej. dos ventas a consumidor final
 * del mismo importe el mismo día), se abstiene y devuelve null → el flujo
 * marca error y queda para revisión/reintento manual, en vez de atribuir a
 * esta venta un CAE que podría ser de otra.
 */
async function reconciliarEmitido(
  arca: Arca,
  puntoVenta: number,
  ultimoAntes: number,
  impTotal: number,
  receptor: ReceptorFiscal,
): Promise<WsfeEmitResult | null> {
  let ultimoAhora: number;
  try {
    ultimoAhora = await conReintentos(() =>
      arca.ultimoComprobante(puntoVenta, CbteTipo.FACTURA_C),
    );
  } catch {
    return null;
  }
  if (!ultimoAhora || ultimoAhora <= ultimoAntes) return null;

  const ahora = new Date();
  const ayer = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);
  const fechasValidas = [ymd(ahora), ymd(ayer)];

  const desde = Math.max(ultimoAntes + 1, ultimoAhora - RECONCILIACION_MAX_SCAN + 1);
  const coincidencias: Record<string, unknown>[] = [];
  for (let n = ultimoAhora; n >= desde; n--) {
    let g: Record<string, unknown> | undefined;
    try {
      const info = await conReintentos(() =>
        arca.consultarComprobante(CbteTipo.FACTURA_C, puntoVenta, n),
      );
      g = info?.ResultGet as Record<string, unknown> | undefined;
    } catch {
      // No pudimos leer este número: no podemos garantizar unicidad → abstenerse.
      return null;
    }
    if (comprobanteCoincide(g, impTotal, receptor, fechasValidas)) {
      coincidencias.push(g!);
    }
  }

  if (coincidencias.length !== 1) {
    if (coincidencias.length > 1) {
      console.error(
        "[wsfe/reconciliacion] ambiguo: múltiples comprobantes coinciden, no se reconcilia",
        JSON.stringify({ candidatos: coincidencias.length, impTotal }),
      );
    }
    return null;
  }

  const g = coincidencias[0];
  console.error(
    "[wsfe/reconciliacion] CAE recuperado sin re-emitir",
    JSON.stringify({ nro: g.CbteDesde, cae: g.CodAutorizacion }),
  );
  return {
    ok: true,
    cae: String(g.CodAutorizacion),
    cae_vencimiento: caeVencimientoToIso(String(g.FchVto || "")),
    tipo_comprobante: Number(g.CbteTipo),
    punto_venta: Number(g.PtoVta),
    numero_comprobante: Number(g.CbteDesde),
    importe_total: Number(g.ImpTotal),
    reconciliado: true,
  };
}

export type ComprobanteOriginal = {
  tipo: number;
  ptoVta: number;
  nro: number;
  fecha?: string;
};

async function reconciliarNcEmitido(
  arca: Arca,
  puntoVenta: number,
  ultimoAntes: number,
  impTotal: number,
  receptor: ReceptorFiscal,
): Promise<WsfeEmitResult | null> {
  let ultimoAhora: number;
  try {
    ultimoAhora = await conReintentos(() =>
      arca.ultimoComprobante(puntoVenta, CbteTipo.NOTA_CREDITO_C),
    );
  } catch {
    return null;
  }
  if (!ultimoAhora || ultimoAhora <= ultimoAntes) return null;

  const ahora = new Date();
  const ayer = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);
  const fechasValidas = [ymd(ahora), ymd(ayer)];

  const desde = Math.max(ultimoAntes + 1, ultimoAhora - RECONCILIACION_MAX_SCAN + 1);
  const coincidencias: Record<string, unknown>[] = [];
  for (let n = ultimoAhora; n >= desde; n--) {
    let g: Record<string, unknown> | undefined;
    try {
      const info = await conReintentos(() =>
        arca.consultarComprobante(CbteTipo.NOTA_CREDITO_C, puntoVenta, n),
      );
      g = info?.ResultGet as Record<string, unknown> | undefined;
    } catch {
      return null;
    }
    if (comprobanteCoincide(g, impTotal, receptor, fechasValidas)) {
      coincidencias.push(g!);
    }
  }

  if (coincidencias.length !== 1) {
    if (coincidencias.length > 1) {
      console.error(
        "[wsfe/reconciliacion-nc] ambiguo",
        JSON.stringify({ candidatos: coincidencias.length, impTotal }),
      );
    }
    return null;
  }

  const g = coincidencias[0];
  console.error(
    "[wsfe/reconciliacion-nc] CAE recuperado sin re-emitir",
    JSON.stringify({ nro: g.CbteDesde, cae: g.CodAutorizacion }),
  );
  return {
    ok: true,
    cae: String(g.CodAutorizacion),
    cae_vencimiento: caeVencimientoToIso(String(g.FchVto || "")),
    tipo_comprobante: Number(g.CbteTipo),
    punto_venta: Number(g.PtoVta),
    numero_comprobante: Number(g.CbteDesde),
    importe_total: Number(g.ImpTotal),
    reconciliado: true,
  };
}

export async function emitNotaCreditoWsfe(
  importeTotal: number,
  puntoVenta: number,
  receptor: ReceptorFiscal,
  comprobanteOriginal: ComprobanteOriginal,
): Promise<WsfeEmitResult> {
  const arca = buildArca();
  if (!(arca instanceof Arca)) {
    return { ok: false, importe_total: importeTotal, error: arca.error };
  }

  const impTotal = Math.round(importeTotal * 100) / 100;

  let ultimoAntes: number | null = null;
  try {
    ultimoAntes = await conReintentos(() =>
      arca.ultimoComprobante(puntoVenta, CbteTipo.NOTA_CREDITO_C),
    );
  } catch (err) {
    console.error(
      "[wsfe/ultimoComprobante-nc]",
      err instanceof Error ? err.message : String(err),
    );
  }

  try {
    const result = await arca.notaCredito({
      ptoVta: puntoVenta,
      comprobanteOriginal,
      items: [{ neto: impTotal }],
      docTipo: receptor.doc_tipo,
      docNro: receptor.doc_nro,
      condicionIva: receptor.condicion_iva,
    });

    if (!result.aprobada) {
      const obs =
        result.observaciones?.map((o) => `${o.code}: ${o.msg}`).join("; ") ||
        "Nota de crédito rechazada por AFIP";
      console.error("[wsfe/arca/nc] rechazado", obs);
      return {
        ok: false,
        importe_total: impTotal,
        error: humanizeAfipError(obs, puntoVenta),
      };
    }

    if (!result.cae) {
      return {
        ok: false,
        importe_total: impTotal,
        error: "AFIP aprobó la NC sin devolver CAE",
      };
    }

    return {
      ok: true,
      cae: String(result.cae),
      cae_vencimiento: caeVencimientoToIso(result.caeVencimiento),
      tipo_comprobante: result.cbteTipo,
      punto_venta: result.ptoVta,
      numero_comprobante: result.cbteNro,
      importe_total: impTotal,
    };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    console.error("[emitNotaCreditoWsfe]", raw);

    if (ultimoAntes != null && debeReconciliar(err)) {
      try {
        const recuperado = await reconciliarNcEmitido(
          arca,
          puntoVenta,
          ultimoAntes,
          impTotal,
          receptor,
        );
        if (recuperado) return recuperado;
      } catch (reconErr) {
        console.error(
          "[wsfe/reconciliacion-nc]",
          reconErr instanceof Error ? reconErr.message : String(reconErr),
        );
      }
    }

    return {
      ok: false,
      importe_total: impTotal,
      error: humanizeAfipError(raw, puntoVenta),
    };
  }
}

export async function emitWsfe(
  _ventas: VentaRow[],
  importeTotal: number,
  puntoVenta: number,
  receptor: ReceptorFiscal,
): Promise<WsfeEmitResult> {
  const arca = buildArca();
  if (!(arca instanceof Arca)) {
    return { ok: false, importe_total: importeTotal, error: arca.error };
  }

  const impTotal = Math.round(importeTotal * 100) / 100;

  // Baseline: último comprobante autorizado ANTES de emitir. Si la emisión
  // falla por red, sirve para reconciliar y no re-emitir un CAE ya otorgado.
  let ultimoAntes: number | null = null;
  try {
    ultimoAntes = await conReintentos(() =>
      arca.ultimoComprobante(puntoVenta, CbteTipo.FACTURA_C),
    );
  } catch (err) {
    console.error(
      "[wsfe/ultimoComprobante]",
      err instanceof Error ? err.message : String(err),
    );
  }

  try {
    const result = await arca.facturar({
      ptoVta: puntoVenta,
      cbteTipo: CbteTipo.FACTURA_C,
      items: [{ neto: impTotal }],
      docTipo: receptor.doc_tipo,
      docNro: receptor.doc_nro,
      condicionIva: receptor.condicion_iva,
    });

    if (!result.aprobada) {
      const obs =
        result.observaciones?.map((o) => `${o.code}: ${o.msg}`).join("; ") ||
        "Comprobante rechazado por AFIP";
      console.error("[wsfe/arca] rechazado", obs);
      return {
        ok: false,
        importe_total: impTotal,
        error: humanizeAfipError(obs, puntoVenta),
      };
    }

    if (!result.cae) {
      return {
        ok: false,
        importe_total: impTotal,
        error: "AFIP aprobó sin devolver CAE",
      };
    }

    return {
      ok: true,
      cae: String(result.cae),
      cae_vencimiento: caeVencimientoToIso(result.caeVencimiento),
      tipo_comprobante: result.cbteTipo,
      punto_venta: result.ptoVta,
      numero_comprobante: result.cbteNro,
      importe_total: impTotal,
    };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    console.error("[emitWsfe]", raw);

    // Reconciliación: solo ante errores de transporte, y solo si teníamos el
    // baseline. Quizás AFIP sí autorizó el CAE y perdimos la respuesta.
    if (ultimoAntes != null && debeReconciliar(err)) {
      try {
        const recuperado = await reconciliarEmitido(
          arca,
          puntoVenta,
          ultimoAntes,
          impTotal,
          receptor,
        );
        if (recuperado) return recuperado;
      } catch (reconErr) {
        console.error(
          "[wsfe/reconciliacion]",
          reconErr instanceof Error ? reconErr.message : String(reconErr),
        );
      }
    }

    return {
      ok: false,
      importe_total: impTotal,
      error: humanizeAfipError(raw, puntoVenta),
    };
  }
}
