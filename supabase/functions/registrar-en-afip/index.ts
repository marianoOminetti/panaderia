/**
 * Edge Function: registrar-en-afip
 *
 * Registra un comprobante electrónico en AFIP para una venta (transaccion_id).
 * No genera PDF; solo solicita CAE y persiste el resultado.
 *
 * Body: { transaccion_id: string }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { emitWsfe } from "./wsfe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const AFIP_PROVIDER = (Deno.env.get("AFIP_PROVIDER") || "").toLowerCase();
const AFIP_CUIT = Deno.env.get("AFIP_CUIT") || "";
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

const AFIP_ALLOW_MOCK = Deno.env.get("AFIP_ALLOW_MOCK") === "true";

function resolveProvider(): "mock" | "tusfacturas" | "wsfe" | null {
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
  if (AFIP_ALLOW_MOCK) return "mock";
  return null;
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
  cliente: { nombre?: string } | null,
): Promise<EmitResult> {
  const detalle = ventas.map((v) => ({
    descripcion: v.recetas?.nombre || "Producto",
    cantidad: Number(v.cantidad || 0),
    precio_unitario_sin_iva: Number(v.precio_unitario || 0),
    alicuota: 0,
  }));

  const payload = {
    usertoken: TUSFACTURAS_USER_TOKEN,
    apikey: TUSFACTURAS_API_KEY,
    cliente: {
      documento_tipo: "OTRO",
      documento_nro: "0",
      razon_social: cliente?.nombre || "Consumidor Final",
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
  cliente: { nombre?: string } | null,
  provider: "mock" | "tusfacturas" | "wsfe",
): Promise<EmitResult> {
  const importeTotal = ventas.reduce((s, v) => s + lineTotal(v), 0);
  if (provider === "wsfe") {
    return emitWsfe(ventas, importeTotal, AFIP_PUNTO_VENTA);
  }
  if (provider === "tusfacturas") {
    return emitTusFacturas(ventas, importeTotal, cliente);
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

  let body: { transaccion_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const transaccionId = body?.transaccion_id;
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
      "estado, cae, cae_vencimiento, numero_comprobante, punto_venta, importe_total, error_mensaje, updated_at",
    )
    .eq("transaccion_id", transaccionId)
    .maybeSingle();

  if (existente?.estado === "pendiente") {
    return new Response(
      JSON.stringify({
        ok: false,
        estado: "pendiente",
        error: "Registro en curso. Esperá unos segundos e intentá de nuevo.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (existente?.estado === "autorizada" || existente?.estado === "mock") {
    return new Response(
      JSON.stringify({
        ok: true,
        estado: existente.estado,
        cae: existente.cae,
        numero_comprobante: existente.numero_comprobante,
        punto_venta: existente.punto_venta,
        already_registered: true,
        mock: existente.estado === "mock",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (existente?.cae && existente.estado === "error") {
    return new Response(
      JSON.stringify({
        ok: false,
        estado: "error",
        error:
          existente.error_mensaje ||
          "Comprobante con CAE pendiente de conciliación. Contactá soporte.",
        cae: existente.cae,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
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

  let cliente: { nombre?: string } | null = null;
  const clienteId = ventas[0]?.cliente_id;
  if (clienteId) {
    const { data: c } = await supabaseAdmin
      .from("clientes")
      .select("nombre")
      .eq("id", clienteId)
      .maybeSingle();
    cliente = c;
  }

  const { error: upsertErr } = await supabaseAdmin.from("facturas_electronicas").upsert(
    {
      transaccion_id: transaccionId,
      importe_total: importeTotal,
      estado: "pendiente",
      error_mensaje: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "transaccion_id" },
  );

  if (upsertErr) {
    console.error("[registrar-en-afip/upsert]", upsertErr);
    return new Response(
      JSON.stringify({ error: "No se pudo iniciar el registro fiscal" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const emit = await emitirComprobante(ventas as VentaRow[], cliente, provider);

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

  const estadoFinal = provider === "mock" ? "mock" : "autorizada";

  const { error: updateErr } = await supabaseAdmin
    .from("facturas_electronicas")
    .update({
      estado: estadoFinal,
      cae: emit.cae,
      cae_vencimiento: emit.cae_vencimiento || null,
      tipo_comprobante: emit.tipo_comprobante ?? null,
      punto_venta: emit.punto_venta ?? null,
      numero_comprobante: emit.numero_comprobante ?? null,
      importe_total: emit.importe_total,
      error_mensaje: null,
      updated_at: new Date().toISOString(),
    })
    .eq("transaccion_id", transaccionId);

  if (updateErr) {
    console.error("[registrar-en-afip/update]", updateErr);
    await supabaseAdmin
      .from("facturas_electronicas")
      .update({
        estado: "error",
        cae: emit.cae,
        cae_vencimiento: emit.cae_vencimiento || null,
        tipo_comprobante: emit.tipo_comprobante ?? null,
        punto_venta: emit.punto_venta ?? null,
        numero_comprobante: emit.numero_comprobante ?? null,
        importe_total: emit.importe_total,
        error_mensaje: "CAE obtenido; falló guardado final. No reintentar sin revisar.",
        updated_at: new Date().toISOString(),
      })
      .eq("transaccion_id", transaccionId);

    return new Response(
      JSON.stringify({
        ok: false,
        estado: "error",
        error: "CAE obtenido pero no se pudo confirmar. No reintentar automáticamente.",
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
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
