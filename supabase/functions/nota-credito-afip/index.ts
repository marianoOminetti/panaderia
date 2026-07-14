/**
 * Edge Function: nota-credito-afip
 *
 * Emite una Nota de Crédito C en AFIP para anular fiscalmente una factura ya registrada.
 * No modifica la venta en la app.
 *
 * Body: { transaccion_id: string }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { emitNotaCreditoWsfe } from "../registrar-en-afip/wsfe.ts";
import { resolveReceptorFiscal } from "../registrar-en-afip/receptor.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const AFIP_PROVIDER = (Deno.env.get("AFIP_PROVIDER") || "").toLowerCase();
const AFIP_CUIT = Deno.env.get("AFIP_CUIT") || "";
const AFIP_CUIT_NORMALIZADO = AFIP_CUIT.replace(/\D/g, "").slice(0, 11);
const AFIP_EMISOR_CUIT =
  AFIP_CUIT_NORMALIZADO.length === 11 ? AFIP_CUIT_NORMALIZADO : null;
const AFIP_PUNTO_VENTA = parseInt(Deno.env.get("AFIP_PUNTO_VENTA") || "1", 10);
const AFIP_CERT = Deno.env.get("AFIP_CERT_B64") || Deno.env.get("AFIP_CERT");
const AFIP_KEY = Deno.env.get("AFIP_KEY_B64") || Deno.env.get("AFIP_KEY");

const AFIP_PRODUCTION = Deno.env.get("AFIP_PRODUCTION") === "true";
const AFIP_ALLOW_MOCK =
  Deno.env.get("AFIP_ALLOW_MOCK") === "true" && !AFIP_PRODUCTION;

const PENDIENTE_STALE_MS = 90_000;
const AFIP_TIPO_FACTURA_C = 11;
const AFIP_TIPO_NOTA_CREDITO_C = 13;

const supabaseAdmin = SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  : null;

type EmitResult = {
  ok: boolean;
  cae?: string;
  cae_vencimiento?: string;
  tipo_comprobante?: number;
  punto_venta?: number;
  numero_comprobante?: number;
  importe_total: number;
  error?: string;
};

type NotaCreditoRow = {
  estado: string;
  cae: string | null;
  cae_vencimiento?: string | null;
  numero_comprobante?: number | null;
  punto_venta?: number | null;
  factura_punto_venta?: number | null;
  factura_numero?: number | null;
  importe_total?: number | null;
  error_mensaje?: string | null;
  updated_at?: string | null;
  tipo_comprobante?: number | null;
};

type FacturaRow = {
  estado: string;
  cae: string | null;
  tipo_comprobante?: number | null;
  punto_venta?: number | null;
  numero_comprobante?: number | null;
  importe_total?: number | null;
  receptor_cuit?: string | null;
  receptor_razon_social?: string | null;
  receptor_doc_tipo?: number | null;
  receptor_doc_nro?: string | null;
  created_at?: string | null;
};

function pendienteEsViejo(updatedAt: string | null | undefined): boolean {
  if (!updatedAt) return true;
  const t = new Date(updatedAt).getTime();
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > PENDIENTE_STALE_MS;
}

function resolveProvider(): "mock" | "wsfe" | null {
  if (AFIP_ALLOW_MOCK) return "mock";
  if (AFIP_PROVIDER === "wsfe" && AFIP_CUIT && AFIP_CERT && AFIP_KEY) {
    return "wsfe";
  }
  return null;
}

function estadoDesdeCae(cae: string, provider: "mock" | "wsfe"): string {
  if (provider === "mock" || String(cae).toUpperCase().startsWith("MOCK")) {
    return "mock";
  }
  return "autorizada";
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fechaToYmd(fecha: string | null | undefined): string | undefined {
  if (!fecha) return undefined;
  const s = String(fecha).slice(0, 10).replace(/-/g, "");
  return /^\d{8}$/.test(s) ? s : undefined;
}

function ncAnulaFacturaVigente(
  factura: FacturaRow | null,
  nc: NotaCreditoRow | null,
): boolean {
  if (!factura?.cae || !nc?.cae) return false;
  if (!["autorizada", "mock"].includes(nc.estado)) return false;
  const pv = Number(factura.punto_venta);
  const nro = Number(factura.numero_comprobante);
  const ncPv = Number(nc.factura_punto_venta);
  const ncNro = Number(nc.factura_numero);
  if (!pv || !nro || !ncPv || !ncNro) return false;
  return pv === ncPv && nro === ncNro;
}

function respuestaNcExistente(
  row: NotaCreditoRow | null,
  factura: FacturaRow | null,
): Response | null {
  if (!row) return null;
  if (
    (row.estado === "autorizada" || row.estado === "mock") &&
    ncAnulaFacturaVigente(factura, row)
  ) {
    return jsonResponse({
      ok: true,
      estado: row.estado,
      cae: row.cae,
      numero_comprobante: row.numero_comprobante,
      punto_venta: row.punto_venta,
      already_registered: true,
      mock: row.estado === "mock",
    });
  }
  if (row.cae && row.estado === "error") {
    return null;
  }
  if (row.estado === "pendiente" && !pendienteEsViejo(row.updated_at)) {
    return jsonResponse({
      ok: false,
      estado: "pendiente",
      error: "Nota de crédito en curso. Esperá unos segundos e intentá de nuevo.",
    });
  }
  return null;
}

async function requireAdminRole(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin!
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[nota-credito-afip/role]", error);
    return false;
  }
  return data?.role === "admin";
}

async function confirmarNcExistente(
  transaccionId: string,
  existente: NotaCreditoRow,
  importeTotal: number,
  provider: "mock" | "wsfe",
): Promise<{ ok: boolean; estado?: string; error?: string }> {
  if (!existente.cae) {
    return { ok: false, error: "Sin CAE para confirmar" };
  }
  const estadoFinal = estadoDesdeCae(existente.cae, provider);
  const emit: EmitResult = {
    ok: true,
    cae: existente.cae,
    cae_vencimiento: existente.cae_vencimiento ?? undefined,
    tipo_comprobante: existente.tipo_comprobante ?? AFIP_TIPO_NOTA_CREDITO_C,
    punto_venta: existente.punto_venta ?? AFIP_PUNTO_VENTA,
    numero_comprobante: existente.numero_comprobante ?? undefined,
    importe_total: Number(existente.importe_total) || importeTotal,
  };
  const saved = await persistirNcEmitida(transaccionId, emit, estadoFinal);
  if (!saved.ok) {
    return { ok: false, error: saved.error || "No se pudo confirmar la NC" };
  }
  return { ok: true, estado: estadoFinal };
}

async function persistirNcEmitida(
  transaccionId: string,
  emit: EmitResult,
  estadoFinal: string,
): Promise<{ ok: boolean; error?: string }> {
  const base = {
    estado: estadoFinal,
    cae: emit.cae,
    cae_vencimiento: emit.cae_vencimiento || null,
    tipo_comprobante: emit.tipo_comprobante ?? AFIP_TIPO_NOTA_CREDITO_C,
    punto_venta: emit.punto_venta ?? null,
    numero_comprobante: emit.numero_comprobante ?? null,
    importe_total: emit.importe_total,
    error_mensaje: null,
    updated_at: new Date().toISOString(),
  };

  let { error } = await supabaseAdmin!
    .from("notas_credito_afip")
    .update({ ...base, emisor_cuit: AFIP_EMISOR_CUIT })
    .eq("transaccion_id", transaccionId);

  if (error && /emisor_cuit/i.test(String(error.message || ""))) {
    ({ error } = await supabaseAdmin!
      .from("notas_credito_afip")
      .update(base)
      .eq("transaccion_id", transaccionId));
  }

  if (error) {
    console.error("[nota-credito-afip/update]", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

async function emitMockNc(importeTotal: number): Promise<EmitResult> {
  const numero = Math.floor(Date.now() % 99999999);
  const venc = new Date();
  venc.setDate(venc.getDate() + 10);
  return {
    ok: true,
    cae: `MOCKNC${numero}`,
    cae_vencimiento: venc.toISOString().slice(0, 10),
    tipo_comprobante: AFIP_TIPO_NOTA_CREDITO_C,
    punto_venta: AFIP_PUNTO_VENTA,
    numero_comprobante: numero,
    importe_total: importeTotal,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!supabaseAdmin || !ANON_KEY) {
    return jsonResponse({ error: "Server misconfiguration" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userData?.user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  if (!(await requireAdminRole(userData.user.id))) {
    return jsonResponse(
      { error: "Forbidden: solo administradores pueden emitir notas de crédito" },
      403,
    );
  }

  let body: { transaccion_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const transaccionId = body?.transaccion_id;
  if (!transaccionId) {
    return jsonResponse({ error: "Missing transaccion_id" }, 400);
  }

  const { data: factura, error: facturaErr } = await supabaseAdmin
    .from("facturas_electronicas")
    .select(
      "estado, cae, tipo_comprobante, punto_venta, numero_comprobante, importe_total, receptor_cuit, receptor_razon_social, receptor_doc_tipo, receptor_doc_nro, created_at",
    )
    .eq("transaccion_id", transaccionId)
    .maybeSingle();

  if (facturaErr) {
    console.error("[nota-credito-afip/factura]", facturaErr);
    return jsonResponse({ error: "No se pudo leer la factura" }, 500);
  }

  const facturaRow = factura as FacturaRow | null;
  if (!facturaRow?.cae || !["autorizada", "mock"].includes(facturaRow.estado)) {
    return jsonResponse({
      ok: false,
      error: "La venta no tiene factura AFIP autorizada para anular",
    });
  }

  if (
    !facturaRow.punto_venta ||
    !facturaRow.numero_comprobante ||
    facturaRow.importe_total == null
  ) {
    return jsonResponse({
      ok: false,
      error: "Faltan datos de la factura original (punto de venta, número o importe)",
    });
  }

  const importeTotal = Number(facturaRow.importe_total);

  const { data: existenteNc } = await supabaseAdmin
    .from("notas_credito_afip")
    .select(
      "estado, cae, cae_vencimiento, numero_comprobante, punto_venta, factura_punto_venta, factura_numero, importe_total, error_mensaje, updated_at, tipo_comprobante",
    )
    .eq("transaccion_id", transaccionId)
    .maybeSingle();

  const respExistente = respuestaNcExistente(
    existenteNc as NotaCreditoRow | null,
    facturaRow,
  );
  if (respExistente) return respExistente;

  if (existenteNc?.cae && existenteNc?.estado === "error") {
    const provider = resolveProvider();
    if (provider) {
      const confirmado = await confirmarNcExistente(
        transaccionId,
        existenteNc as NotaCreditoRow,
        importeTotal,
        provider,
      );
      if (confirmado.ok) {
        return jsonResponse({
          ok: true,
          estado: confirmado.estado,
          cae: existenteNc.cae,
          already_registered: true,
          mock: confirmado.estado === "mock",
        });
      }
    }
  }

  const provider = resolveProvider();
  if (!provider) {
    return jsonResponse({
      ok: false,
      error: "Facturación AFIP no configurada en el servidor",
    }, 503);
  }

  const { data: ventas } = await supabaseAdmin
    .from("ventas")
    .select("fecha, cliente_id")
    .eq("transaccion_id", transaccionId)
    .limit(1);

  let clienteNombre: string | null = null;
  const clienteId = ventas?.[0]?.cliente_id;
  if (clienteId) {
    const { data: c } = await supabaseAdmin
      .from("clientes")
      .select("nombre")
      .eq("id", clienteId)
      .maybeSingle();
    clienteNombre = c?.nombre ?? null;
  }

  const receptor = resolveReceptorFiscal({
    receptor_cuit: facturaRow.receptor_cuit ?? null,
    receptor_doc_tipo: facturaRow.receptor_doc_tipo ?? null,
    receptor_doc_nro: facturaRow.receptor_doc_nro ?? null,
    receptor_razon_social: facturaRow.receptor_razon_social ?? null,
    cliente_nombre: clienteNombre,
  });

  const docNroPersist = receptor.dni || receptor.cuit
    ? String(receptor.doc_nro)
    : null;

  const facturaTipo = facturaRow.tipo_comprobante ?? AFIP_TIPO_FACTURA_C;
  const facturaPv = Number(facturaRow.punto_venta);
  const facturaNro = Number(facturaRow.numero_comprobante);
  const facturaFecha =
    facturaRow.created_at?.slice(0, 10) ||
    ventas?.[0]?.fecha?.slice(0, 10) ||
    null;

  const { data: claimRows, error: claimErr } = await supabaseAdmin.rpc(
    "claim_nota_credito_para_emision",
    {
      p_transaccion_id: transaccionId,
      p_importe_total: importeTotal,
      p_factura_tipo: facturaTipo,
      p_factura_punto_venta: facturaPv,
      p_factura_numero: facturaNro,
      p_factura_fecha: facturaFecha,
      p_receptor_cuit: receptor.cuit,
      p_receptor_razon_social: receptor.razon_social,
      p_receptor_doc_tipo: receptor.doc_tipo,
      p_receptor_doc_nro: docNroPersist,
      p_stale_seconds: Math.round(PENDIENTE_STALE_MS / 1000),
    },
  );

  if (claimErr) {
    console.error("[nota-credito-afip/claim]", claimErr);
    return jsonResponse({ error: "No se pudo iniciar la nota de crédito" }, 500);
  }

  const reclamado = Array.isArray(claimRows)
    ? claimRows.length > 0
    : Boolean(claimRows);

  if (!reclamado) {
    const { data: actual } = await supabaseAdmin
      .from("notas_credito_afip")
      .select(
        "estado, cae, cae_vencimiento, numero_comprobante, punto_venta, factura_punto_venta, factura_numero, importe_total, error_mensaje, updated_at, tipo_comprobante",
      )
      .eq("transaccion_id", transaccionId)
      .maybeSingle();

    const respActual = respuestaNcExistente(
      actual as NotaCreditoRow | null,
      facturaRow,
    );
    if (respActual) return respActual;

    return jsonResponse({
      ok: false,
      estado: "pendiente",
      error: "Nota de crédito en curso. Esperá unos segundos e intentá de nuevo.",
    });
  }

  const comprobanteOriginal = {
    tipo: facturaTipo,
    ptoVta: facturaPv,
    nro: facturaNro,
    ...(fechaToYmd(facturaFecha) ? { fecha: fechaToYmd(facturaFecha) } : {}),
  };

  let emit: EmitResult;
  try {
    if (provider === "wsfe") {
      emit = await emitNotaCreditoWsfe(
        importeTotal,
        AFIP_PUNTO_VENTA,
        receptor,
        comprobanteOriginal,
      );
    } else {
      emit = await emitMockNc(importeTotal);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[nota-credito-afip/emit/crash]", transaccionId, msg);
    await supabaseAdmin
      .from("notas_credito_afip")
      .update({
        estado: "error",
        error_mensaje: msg.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("transaccion_id", transaccionId);
    return jsonResponse({ ok: false, estado: "error", error: msg });
  }

  if (!emit.ok) {
    console.error("[nota-credito-afip/emit]", transaccionId, emit.error);
    await supabaseAdmin
      .from("notas_credito_afip")
      .update({
        estado: "error",
        error_mensaje: emit.error?.slice(0, 500) || "Error desconocido",
        updated_at: new Date().toISOString(),
      })
      .eq("transaccion_id", transaccionId);

    return jsonResponse({
      ok: false,
      estado: "error",
      error: emit.error,
      provider,
    });
  }

  const estadoFinal = estadoDesdeCae(emit.cae!, provider);
  const saved = await persistirNcEmitida(transaccionId, emit, estadoFinal);

  if (!saved.ok) {
    await supabaseAdmin!
      .from("notas_credito_afip")
      .update({
        estado: "error",
        cae: emit.cae,
        cae_vencimiento: emit.cae_vencimiento || null,
        tipo_comprobante: emit.tipo_comprobante ?? AFIP_TIPO_NOTA_CREDITO_C,
        punto_venta: emit.punto_venta ?? null,
        numero_comprobante: emit.numero_comprobante ?? null,
        importe_total: emit.importe_total,
        error_mensaje: `CAE obtenido; falló guardado: ${(saved.error || "").slice(0, 200)}`,
        updated_at: new Date().toISOString(),
      })
      .eq("transaccion_id", transaccionId);

    return jsonResponse({
      ok: false,
      estado: "error",
      error: "CAE obtenido pero no se guardó. Reintentá emitir la nota de crédito.",
      cae: emit.cae,
    });
  }

  return jsonResponse({
    ok: true,
    estado: estadoFinal,
    cae: emit.cae,
    numero_comprobante: emit.numero_comprobante,
    punto_venta: emit.punto_venta,
    provider,
    mock: provider === "mock",
  });
});
