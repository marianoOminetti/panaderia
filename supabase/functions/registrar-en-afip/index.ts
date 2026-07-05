/**
 * Edge Function: registrar-en-afip
 *
 * Registra un comprobante electrónico en AFIP para una venta (transaccion_id).
 * No genera PDF; solo solicita CAE y persiste el resultado.
 *
 * Body: { transaccion_id: string, receptor?: { cuit?: string|null, razon_social?: string } }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { emitWsfe } from "./wsfe.ts";
import { resolveReceptorFiscal } from "./receptor.ts";
import type { ReceptorFiscal } from "./receptor.ts";

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
const TUSFACTURAS_API_KEY = Deno.env.get("TUSFACTURAS_API_KEY") || "";
const TUSFACTURAS_USER_TOKEN = Deno.env.get("TUSFACTURAS_USER_TOKEN") || "";

const supabaseAdmin = SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  : null;

type VentaRow = {
  id: string;
  receta_id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number | null;
  total_final: number | null;
  cliente_id: string | null;
  transaccion_id: string;
  recetas: { nombre: string } | null;
};

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

function lineTotal(v: VentaRow): number {
  if (v.total_final != null) return Number(v.total_final);
  if (v.subtotal != null) return Number(v.subtotal);
  return Number(v.precio_unitario || 0) * Number(v.cantidad || 0);
}

const AFIP_PRODUCTION = Deno.env.get("AFIP_PRODUCTION") === "true";
const AFIP_ALLOW_MOCK =
  Deno.env.get("AFIP_ALLOW_MOCK") === "true" && !AFIP_PRODUCTION;

/** Si quedó en pendiente tras timeout/crash, permitir reintento. */
const PENDIENTE_STALE_MS = 90_000;

function pendienteEsViejo(updatedAt: string | null | undefined): boolean {
  if (!updatedAt) return true;
  const t = new Date(updatedAt).getTime();
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > PENDIENTE_STALE_MS;
}

function resolveProvider(): "mock" | "tusfacturas" | "wsfe" | null {
  // Mock primero en dev (AFIP_ALLOW_MOCK + no producción), aunque existan certificados WSFE
  if (AFIP_ALLOW_MOCK) return "mock";
  if (AFIP_PROVIDER === "wsfe" && AFIP_CUIT && AFIP_CERT && AFIP_KEY) {
    return "wsfe";
  }
  if (
    AFIP_PROVIDER === "tusfacturas" &&
    TUSFACTURAS_API_KEY &&
    TUSFACTURAS_USER_TOKEN
  ) {
    return "tusfacturas";
  }
  return null;
}

type FacturaRow = {
  estado: string;
  cae: string | null;
  cae_vencimiento?: string | null;
  numero_comprobante?: number | null;
  punto_venta?: number | null;
  importe_total?: number | null;
  error_mensaje?: string | null;
  updated_at?: string | null;
  receptor_cuit?: string | null;
  receptor_razon_social?: string | null;
  tipo_comprobante?: number | null;
};

function estadoDesdeCae(cae: string, provider: "mock" | "tusfacturas" | "wsfe"): string {
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

/**
 * Si ya existe un comprobante en estado terminal o en curso, devuelve la
 * respuesta correspondiente (sin emitir). Null si la fila es reclamable.
 */
function respuestaComprobanteExistente(row: FacturaRow | null): Response | null {
  if (!row) return null;
  if (row.estado === "autorizada" || row.estado === "mock") {
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
    return jsonResponse({
      ok: false,
      estado: "error",
      error:
        row.error_mensaje ||
        "Comprobante con CAE pendiente de conciliación. Contactá soporte.",
      cae: row.cae,
    });
  }
  if (row.estado === "pendiente" && !pendienteEsViejo(row.updated_at)) {
    return jsonResponse({
      ok: false,
      estado: "pendiente",
      error: "Registro en curso. Esperá unos segundos e intentá de nuevo.",
    });
  }
  return null;
}

/** Persiste CAE emitido; si falla emisor_cuit, reintenta sin esa columna. */
async function persistirComprobanteEmitido(
  transaccionId: string,
  emit: EmitResult,
  estadoFinal: string,
): Promise<{ ok: boolean; error?: string }> {
  const base = {
    estado: estadoFinal,
    cae: emit.cae,
    cae_vencimiento: emit.cae_vencimiento || null,
    tipo_comprobante: emit.tipo_comprobante ?? null,
    punto_venta: emit.punto_venta ?? null,
    numero_comprobante: emit.numero_comprobante ?? null,
    importe_total: emit.importe_total,
    error_mensaje: null,
    updated_at: new Date().toISOString(),
  };

  let { error } = await supabaseAdmin!
    .from("facturas_electronicas")
    .update({ ...base, emisor_cuit: AFIP_EMISOR_CUIT })
    .eq("transaccion_id", transaccionId);

  if (error && /emisor_cuit/i.test(String(error.message || ""))) {
    ({ error } = await supabaseAdmin!
      .from("facturas_electronicas")
      .update(base)
      .eq("transaccion_id", transaccionId));
  }

  if (error) {
    console.error("[registrar-en-afip/update]", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Confirma en DB un CAE ya obtenido (estado error por fallo de guardado). */
async function confirmarCaeExistente(
  transaccionId: string,
  existente: FacturaRow,
  importeTotal: number,
  provider: "mock" | "tusfacturas" | "wsfe",
): Promise<{ ok: boolean; estado?: string; error?: string }> {
  if (!existente.cae) {
    return { ok: false, error: "Sin CAE para confirmar" };
  }
  const estadoFinal = estadoDesdeCae(existente.cae, provider);
  const emit: EmitResult = {
    ok: true,
    cae: existente.cae,
    cae_vencimiento: existente.cae_vencimiento ?? undefined,
    tipo_comprobante: existente.tipo_comprobante ?? 11,
    punto_venta: existente.punto_venta ?? AFIP_PUNTO_VENTA,
    numero_comprobante: existente.numero_comprobante ?? undefined,
    importe_total: Number(existente.importe_total) || importeTotal,
  };
  const saved = await persistirComprobanteEmitido(transaccionId, emit, estadoFinal);
  if (!saved.ok) {
    return { ok: false, error: saved.error || "No se pudo confirmar el comprobante" };
  }
  return { ok: true, estado: estadoFinal };
}

async function requireAdminRole(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin!
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[registrar-en-afip/role]", error);
    return false;
  }
  return data?.role === "admin";
}

async function emitMock(importeTotal: number): Promise<EmitResult> {
  const numero = Math.floor(Date.now() % 99999999);
  const venc = new Date();
  venc.setDate(venc.getDate() + 10);
  return {
    ok: true,
    cae: `MOCK${numero}`,
    cae_vencimiento: venc.toISOString().slice(0, 10),
    tipo_comprobante: 11,
    punto_venta: AFIP_PUNTO_VENTA,
    numero_comprobante: numero,
    importe_total: importeTotal,
  };
}

async function emitTusFacturas(
  ventas: VentaRow[],
  importeTotal: number,
  receptor: ReceptorFiscal,
): Promise<EmitResult> {
  const detalle = ventas.map((v) => ({
    descripcion: v.recetas?.nombre || "Producto",
    cantidad: Number(v.cantidad || 0),
    precio_unitario_sin_iva: Number(v.precio_unitario || 0),
    alicuota: 0,
  }));

  const docTipo = receptor.doc_tipo === 96
    ? "DNI"
    : receptor.cuit
    ? "CUIT"
    : "OTRO";
  const docNro = receptor.dni || receptor.cuit || "0";

  const payload = {
    usertoken: TUSFACTURAS_USER_TOKEN,
    apikey: TUSFACTURAS_API_KEY,
    cliente: {
      documento_tipo: docTipo,
      documento_nro: docNro,
      razon_social: receptor.razon_social,
      condicion_iva: "CF",
      domicilio: "",
      email: "",
    },
    comprobante: {
      tipo: "FACTURA C",
      operacion: "V",
      punto_venta: String(AFIP_PUNTO_VENTA).padStart(5, "0"),
      moneda: "PES",
      detalle,
    },
  };

  const res = await fetch("https://www.tusfacturas.app/app/api/v2/facturacion/nuevo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error === "S" || data?.errores?.length) {
    const msg =
      data?.errores?.[0]?.mensaje ||
      data?.mensaje ||
      data?.error ||
      `HTTP ${res.status}`;
    return { ok: false, importe_total: importeTotal, error: String(msg) };
  }

  const cae = data?.cae || data?.comprobante?.cae;
  if (!cae) {
    return {
      ok: false,
      importe_total: importeTotal,
      error: "Respuesta del proveedor sin CAE",
    };
  }

  return {
    ok: true,
    cae: String(cae),
    cae_vencimiento: data?.vencimiento_cae || data?.comprobante?.vencimiento_cae,
    tipo_comprobante: 11,
    punto_venta: AFIP_PUNTO_VENTA,
    numero_comprobante: Number(data?.numero || data?.comprobante?.numero || 0),
    importe_total: importeTotal,
  };
}

async function emitirComprobante(
  ventas: VentaRow[],
  receptor: ReceptorFiscal,
  provider: "mock" | "tusfacturas" | "wsfe",
): Promise<EmitResult> {
  const importeTotal = ventas.reduce((s, v) => s + lineTotal(v), 0);
  if (provider === "wsfe") {
    return emitWsfe(ventas, importeTotal, AFIP_PUNTO_VENTA, receptor);
  }
  if (provider === "tusfacturas") {
    return emitTusFacturas(ventas, importeTotal, receptor);
  }
  return emitMock(importeTotal);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!supabaseAdmin || !ANON_KEY) {
    return new Response(
      JSON.stringify({ error: "Server misconfiguration" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!(await requireAdminRole(userData.user.id))) {
    return new Response(
      JSON.stringify({ error: "Forbidden: solo administradores pueden facturar" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let body: {
    transaccion_id?: string;
    refacturar?: boolean;
    receptor?: {
      cuit?: string | null;
      dni?: string | null;
      doc_tipo?: number;
      doc_nro?: number | string | null;
      razon_social?: string;
    };
  };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const transaccionId = body?.transaccion_id;
  const refacturar = body?.refacturar === true;
  if (!transaccionId) {
    return new Response(
      JSON.stringify({ error: "Missing transaccion_id" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { data: ventas, error: ventasErr } = await supabaseAdmin
    .from("ventas")
    .select(
      "id, receta_id, cantidad, precio_unitario, subtotal, total_final, cliente_id, transaccion_id, recetas(nombre)",
    )
    .eq("transaccion_id", transaccionId);

  if (ventasErr) {
    console.error("[registrar-en-afip/ventas]", ventasErr);
    return new Response(
      JSON.stringify({ error: "No se pudieron leer las ventas" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!ventas?.length) {
    return new Response(
      JSON.stringify({ error: "Venta no encontrada" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const importeTotal = (ventas as VentaRow[]).reduce((s, v) => s + lineTotal(v), 0);

  const { data: existente } = await supabaseAdmin
    .from("facturas_electronicas")
    .select(
      "estado, cae, cae_vencimiento, numero_comprobante, punto_venta, importe_total, error_mensaje, updated_at, receptor_cuit, receptor_razon_social, receptor_doc_tipo, receptor_doc_nro, tipo_comprobante",
    )
    .eq("transaccion_id", transaccionId)
    .maybeSingle();

  if (refacturar) {
    const { data: nc, error: ncErr } = await supabaseAdmin
      .from("notas_credito_afip")
      .select("estado, cae, factura_punto_venta, factura_numero")
      .eq("transaccion_id", transaccionId)
      .maybeSingle();

    if (ncErr) {
      console.error("[registrar-en-afip/nc-refacturar]", ncErr);
      return jsonResponse({ error: "No se pudo leer la nota de crédito" }, 500);
    }

    const facturaRow = existente as FacturaRow | null;
    if (
      !facturaRow?.cae ||
      !["autorizada", "mock", "error"].includes(facturaRow.estado) ||
      !nc?.cae ||
      !["autorizada", "mock"].includes(nc.estado)
    ) {
      return jsonResponse({
        ok: false,
        error: "Para refacturar hace falta factura y nota de crédito autorizadas",
      });
    }

    if (
      Number(nc.factura_punto_venta) !== Number(facturaRow.punto_venta) ||
      Number(nc.factura_numero) !== Number(facturaRow.numero_comprobante)
    ) {
      return jsonResponse({
        ok: false,
        error: "La nota de crédito no anula la factura vigente de esta venta",
      });
    }
  } else {
    const respExistente = respuestaComprobanteExistente(existente as FacturaRow | null);
    if (respExistente) return respExistente;
  }

  const provider = resolveProvider();
  if (!provider) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Facturación AFIP no configurada en el servidor",
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let clienteNombre: string | null = null;
  const clienteId = ventas[0]?.cliente_id;
  if (clienteId) {
    const { data: c } = await supabaseAdmin
      .from("clientes")
      .select("nombre")
      .eq("id", clienteId)
      .maybeSingle();
    clienteNombre = c?.nombre ?? null;
  }

  const fromBody = body.receptor != null;
  const receptorRazon = fromBody
    ? (body.receptor?.razon_social ?? "").trim() || null
    : existente?.receptor_razon_social ?? null;

  const receptor = resolveReceptorFiscal(
    fromBody
      ? {
        receptor_cuit: body.receptor?.cuit ?? null,
        receptor_dni: body.receptor?.dni ?? null,
        receptor_doc_tipo: body.receptor?.doc_tipo ?? null,
        receptor_doc_nro: body.receptor?.doc_nro != null
          ? String(body.receptor.doc_nro)
          : null,
        receptor_razon_social: receptorRazon,
        cliente_nombre: clienteNombre,
      }
      : {
        receptor_cuit: existente?.receptor_cuit ?? null,
        receptor_doc_tipo: existente?.receptor_doc_tipo ?? null,
        receptor_doc_nro: existente?.receptor_doc_nro ?? null,
        receptor_razon_social: receptorRazon,
        cliente_nombre: clienteNombre,
      },
  );

  const docNroPersist = receptor.dni || receptor.cuit
    ? String(receptor.doc_nro)
    : null;

  // Candado atómico: solo UN request concurrente puede reclamar la emisión.
  const claimRpc = refacturar
    ? "claim_factura_para_refacturacion"
    : "claim_factura_para_emision";
  const { data: claimRows, error: claimErr } = await supabaseAdmin.rpc(
    claimRpc,
    {
      p_transaccion_id: transaccionId,
      p_importe_total: importeTotal,
      p_receptor_cuit: receptor.cuit,
      p_receptor_razon_social: receptor.razon_social,
      p_receptor_doc_tipo: receptor.doc_tipo,
      p_receptor_doc_nro: docNroPersist,
      p_stale_seconds: Math.round(PENDIENTE_STALE_MS / 1000),
    },
  );

  if (claimErr) {
    console.error("[registrar-en-afip/claim]", claimErr);
    return jsonResponse({ error: "No se pudo iniciar el registro fiscal" }, 500);
  }

  const reclamado = Array.isArray(claimRows)
    ? claimRows.length > 0
    : Boolean(claimRows);

  if (!reclamado) {
    const { data: actual } = await supabaseAdmin
      .from("facturas_electronicas")
      .select(
        "estado, cae, cae_vencimiento, numero_comprobante, punto_venta, importe_total, error_mensaje, updated_at, receptor_cuit, receptor_razon_social, receptor_doc_tipo, receptor_doc_nro, tipo_comprobante",
      )
      .eq("transaccion_id", transaccionId)
      .maybeSingle();

    if (!refacturar) {
      const respActual = respuestaComprobanteExistente(actual as FacturaRow | null);
      if (respActual) return respActual;
    }

    return jsonResponse({
      ok: false,
      estado: "pendiente",
      error: refacturar
        ? "Refacturación en curso. Esperá unos segundos e intentá de nuevo."
        : "Registro en curso. Esperá unos segundos e intentá de nuevo.",
    });
  }

  let emit: EmitResult;
  try {
    emit = await emitirComprobante(ventas as VentaRow[], receptor, provider);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[registrar-en-afip/emit/crash]", transaccionId, msg);
    await supabaseAdmin
      .from("facturas_electronicas")
      .update({
        estado: "error",
        error_mensaje: msg.slice(0, 500),
        importe_total: importeTotal,
        updated_at: new Date().toISOString(),
      })
      .eq("transaccion_id", transaccionId);
    return new Response(
      JSON.stringify({ ok: false, estado: "error", error: msg }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!emit.ok) {
    console.error("[registrar-en-afip/emit]", transaccionId, emit.error);
    await supabaseAdmin
      .from("facturas_electronicas")
      .update({
        estado: "error",
        error_mensaje: emit.error?.slice(0, 500) || "Error desconocido",
        importe_total: importeTotal,
        updated_at: new Date().toISOString(),
      })
      .eq("transaccion_id", transaccionId);

    return new Response(
      JSON.stringify({
        ok: false,
        estado: "error",
        error: emit.error,
        provider: resolveProvider(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const estadoFinal = estadoDesdeCae(emit.cae!, provider);
  const saved = await persistirComprobanteEmitido(transaccionId, emit, estadoFinal);

  if (!saved.ok) {
    await supabaseAdmin!
      .from("facturas_electronicas")
      .update({
        estado: "error",
        cae: emit.cae,
        cae_vencimiento: emit.cae_vencimiento || null,
        tipo_comprobante: emit.tipo_comprobante ?? null,
        punto_venta: emit.punto_venta ?? null,
        numero_comprobante: emit.numero_comprobante ?? null,
        importe_total: emit.importe_total,
        error_mensaje: `CAE obtenido; falló guardado: ${(saved.error || "").slice(0, 200)}. Tocá AFIP de nuevo para confirmar.`,
        updated_at: new Date().toISOString(),
      })
      .eq("transaccion_id", transaccionId);

    return new Response(
      JSON.stringify({
        ok: false,
        estado: "error",
        error:
          "CAE obtenido pero no se guardó. Tocá AFIP en la venta otra vez para confirmar.",
        cae: emit.cae,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      estado: estadoFinal,
      cae: emit.cae,
      numero_comprobante: emit.numero_comprobante,
      punto_venta: emit.punto_venta,
      provider,
      mock: provider === "mock",
      refacturado: refacturar,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
