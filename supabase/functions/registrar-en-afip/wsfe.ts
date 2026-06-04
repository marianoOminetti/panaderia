/**
 * Emisión directa vía Web Services AFIP (WSAA + WSFE) con certificado ARCA.
 * @ramiidv/arca-facturacion omite SOAPAction en WSAA; AFIP exige urn:LoginCms.
 */

import { Arca, CbteTipo } from "npm:@ramiidv/arca-facturacion@2.0.0";

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
};

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

export async function emitWsfe(
  _ventas: VentaRow[],
  importeTotal: number,
  puntoVenta: number,
): Promise<WsfeEmitResult> {
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
      ok: false,
      importe_total: importeTotal,
      error: "Faltan AFIP_CUIT y certificado/clave (AFIP_CERT_B64 + AFIP_KEY_B64)",
    };
  }

  const impTotal = Math.round(importeTotal * 100) / 100;

  try {
    const arca = new Arca({
      cuit,
      cert,
      key,
      production,
      onEvent: (e) => {
        if (e.type === "request:error" || e.type === "soap:fault") {
          console.error("[wsfe/arca]", e.type, JSON.stringify(e).slice(0, 600));
        }
      },
    });

    const result = await arca.facturar({
      ptoVta: puntoVenta,
      cbteTipo: CbteTipo.FACTURA_C,
      items: [{ neto: impTotal }],
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
    const msg = humanizeAfipError(raw, puntoVenta);
    console.error("[emitWsfe]", raw);
    return { ok: false, importe_total: impTotal, error: msg };
  }
}
