/**
 * Edge Function: notify-event
 *
 * Recibe eventos de alto nivel (venta, stock_zero, ingreso_mercaderia) y construye
 * el mensaje de notificación en el backend. Luego delega el envío a la función send-push.
 *
 * Body:
 *   {
 *     type: "venta" | "stock_zero" | "ingreso_mercaderia",
 *     payload: {
 *       // venta:
 *       //   transaccion_id?: string
 *       //   venta_ids?: string[]
 *       //
 *       // stock_zero:
 *       //   receta_id: string
 *       //
 *       // ingreso_mercaderia:
 *       //   insumo_id?: string
 *       //   movimiento_id?: string
 *       //   cantidad?: number
 *     }
 *   }
 *
 * Seguridad:
 * - Solo se construyen mensajes a partir de datos de la DB o de payloads acotados.
 * - Esta función usa service role y puede leer ventas/recetas/insumos aunque RLS restrinja al cliente.
 * - Debe ser llamada desde el frontend sólo como fire-and-forget, sin permitir al usuario
 *   elegir destinatarios ni contenido arbitrario.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { executeSendPush } from "../_shared/sendPushCore.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SERVICE_ROLE_KEY) {
  console.error("[notify-event] SUPABASE_SERVICE_ROLE_KEY not set");
}

const supabaseAdmin = SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  : null;

type VentaPayload = {
  transaccion_id?: string;
  venta_ids?: string[];
  /** Solo venta_eliminada: datos del grupo ya borrado en DB */
  snapshot?: { total: number; cliente_id?: string | null; tiene_deuda?: boolean };
};

type NotifyBody =
  | { type: "venta"; payload: VentaPayload }
  | { type: "venta_modificada"; payload: VentaPayload }
  | { type: "venta_eliminada"; payload: VentaPayload }
  | { type: "stock_zero"; payload: { receta_id: string } }
  | {
      type: "ingreso_mercaderia";
      payload: { insumo_id?: string; movimiento_id?: string; cantidad?: number };
    }
  | { type: "test"; payload: Record<string, never> };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!supabaseAdmin) {
    return new Response(
      JSON.stringify({ error: "Server misconfiguration" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let body: NotifyBody;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!body?.type || !body.payload) {
    return new Response(
      JSON.stringify({ error: "Missing type or payload" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    if (
      body.type === "venta" ||
      body.type === "venta_modificada" ||
      body.type === "venta_eliminada"
    ) {
      const result = await handleVentaNotify(body.payload, supabaseAdmin, body.type);
      return new Response(JSON.stringify(result), {
        status: result.status || 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.type === "stock_zero") {
      const result = await handleStockZero(body.payload, supabaseAdmin);
      return new Response(JSON.stringify(result), {
        status: result.status || 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.type === "ingreso_mercaderia") {
      const result = await handleIngresoMercaderia(body.payload, supabaseAdmin);
      return new Response(JSON.stringify(result), {
        status: result.status || 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.type === "test") {
      const result = await handleTestPush();
      return new Response(JSON.stringify(result), {
        status: result.status || 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Unsupported type" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[notify-event] unhandled error", e);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

async function handleTestPush() {
  const title = "Prueba push · Panadería";
  const body = `Test ${new Date().toISOString()}`;
  const tag = `test-${crypto.randomUUID()}`;

  const push = await executeSendPush({ title, body, url: "/?tab=mas", tag }, supabaseAdmin!);
  if (!push.ok) {
    return { status: 500, error: push.error };
  }

  return { ok: true, push: { sent: push.sent, total: push.total, message: push.message } };
}

async function pushVentaFromSnapshot(
  snapshot: { total: number; cliente_id?: string | null; tiene_deuda?: boolean },
  supabase: ReturnType<typeof createClient>,
  kind: "venta_eliminada",
  transaccion_id?: string,
  venta_ids?: string[],
) {
  const fmt = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
  const title = `Venta eliminada ${fmt.format(snapshot.total)}`;

  let clienteNombre = "Consumidor final";
  if (snapshot.cliente_id) {
    const { data: cliente } = await supabase
      .from("clientes")
      .select("nombre")
      .eq("id", snapshot.cliente_id)
      .maybeSingle();
    if (cliente?.nombre) clienteNombre = cliente.nombre;
  }

  const estadoTxt = snapshot.tiene_deuda ? "Debe" : "Pagado";
  const body = `${clienteNombre} · ${estadoTxt}`;
  const grupoKey = transaccion_id || (venta_ids && venta_ids[0]) || "grupo";
  const tag = `${kind}-${grupoKey}-${Date.now()}`;

  const push = await executeSendPush({ title, body, url: "/?tab=ventas", tag }, supabase);
  if (!push.ok) return { status: 500, error: push.error };
  return { ok: true, push: { sent: push.sent, total: push.total, message: push.message } };
}

async function handleVentaNotify(
  payload: VentaPayload,
  supabase: ReturnType<typeof createClient>,
  kind: "venta" | "venta_modificada" | "venta_eliminada",
) {
  const { transaccion_id, venta_ids, snapshot } = payload || {};

  if (
    kind === "venta_eliminada" &&
    snapshot &&
    typeof snapshot.total === "number"
  ) {
    return await pushVentaFromSnapshot(snapshot, supabase, kind, transaccion_id, venta_ids);
  }

  if (!transaccion_id && (!venta_ids || !Array.isArray(venta_ids) || !venta_ids.length)) {
    return { status: 400, error: "venta payload must include transaccion_id or venta_ids" };
  }

  let query = supabase
    .from("ventas")
    .select("id, total_final, precio_unitario, cantidad, cliente_id, estado_pago, transaccion_id");

  if (venta_ids?.length) {
    query = query.in("id", venta_ids);
  } else if (transaccion_id) {
    query = query.eq("transaccion_id", transaccion_id);
  }

  const { data: ventas, error } = await query;
  if (error) {
    console.error("[notify-event] ventas query", error);
    return { status: 500, error: "Failed to load ventas" };
  }
  if (!ventas || ventas.length === 0) {
    return { status: 404, error: "No ventas found for event" };
  }

  const montoVenta = (v: { total_final: unknown; precio_unitario: unknown; cantidad: unknown }) =>
    v.total_final != null
      ? Number(v.total_final)
      : (Number(v.precio_unitario) || 0) * (Number(v.cantidad) || 0);

  const total = ventas.reduce((s: number, v) => s + montoVenta(v), 0);

  const fmt = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

  const titleLabels = {
    venta: "Venta",
    venta_modificada: "Venta modificada",
    venta_eliminada: "Venta eliminada",
  } as const;
  const title = `${titleLabels[kind]} ${fmt.format(total)}`;

  const clienteId = ventas[0]?.cliente_id;
  let clienteNombre = "Consumidor final";
  if (clienteId) {
    const { data: cliente, error: clienteError } = await supabase
      .from("clientes")
      .select("nombre")
      .eq("id", clienteId)
      .maybeSingle();
    if (!clienteError && cliente?.nombre) {
      clienteNombre = cliente.nombre;
    }
  }

  const tieneDeuda = ventas.some((v) => v.estado_pago === "debe");
  const estadoTxt = tieneDeuda ? "Debe" : "Pagado";
  const body = `${clienteNombre} · ${estadoTxt}`;

  const grupoKey =
    ventas[0]?.transaccion_id || ventas[0]?.id || transaccion_id || (venta_ids && venta_ids[0]);

  const url =
    kind === "venta_eliminada"
      ? "/?tab=ventas"
      : grupoKey
        ? `/?tab=ventas&venta=${encodeURIComponent(grupoKey)}`
        : "/?tab=ventas";

  const tag = `${kind}-${grupoKey || "grupo"}-${Date.now()}`;

  const push = await executeSendPush({ title, body, url, tag }, supabase);
  if (!push.ok) {
    return { status: 500, error: push.error };
  }

  return { ok: true, push: { sent: push.sent, total: push.total, message: push.message } };
}

async function handleStockZero(
  payload: { receta_id: string },
  supabase: ReturnType<typeof createClient>,
) {
  const { receta_id } = payload || {};
  if (!receta_id) {
    return { status: 400, error: "stock_zero payload must include receta_id" };
  }

  const { data: receta, error } = await supabase
    .from("recetas")
    .select("nombre")
    .eq("id", receta_id)
    .maybeSingle();

  if (error) {
    console.error("[notify-event] recetas query", error);
    return { status: 500, error: "Failed to load receta" };
  }

  const nombre = receta?.nombre || "producto";
  const title = "Stock en 0";
  const body = `${nombre} se quedó sin stock.`;

  const tag = `stock-zero-${receta_id}-${Date.now()}`;

  const push = await executeSendPush({ title, body, tag }, supabase);
  if (!push.ok) {
    return { status: 500, error: push.error };
  }

  return { ok: true, push: { sent: push.sent, total: push.total, message: push.message } };
}

async function handleIngresoMercaderia(
  payload: { insumo_id?: string; movimiento_id?: string; cantidad?: number },
  supabase: ReturnType<typeof createClient>,
) {
  const { insumo_id, movimiento_id } = payload || {};

  let descripcion = "Ingreso de mercadería";

  if (insumo_id) {
    const { data: insumo, error } = await supabase
      .from("insumos")
      .select("nombre")
      .eq("id", insumo_id)
      .maybeSingle();
    if (error) {
      console.error("[notify-event] insumos query", error);
    }
    if (insumo?.nombre) {
      descripcion = `Ingreso de mercadería: ${insumo.nombre}`;
    }
  }

  // No exponemos montos ni detalles de precios aquí
  const title = "Ingreso de mercadería";
  const body = movimiento_id ? `${descripcion}` : "Se registró una compra de insumos.";

  const tag = movimiento_id
    ? `ingreso-${movimiento_id}`
    : insumo_id
      ? `ingreso-${insumo_id}-${Date.now()}`
      : `ingreso-${crypto.randomUUID()}`;

  const push = await executeSendPush({ title, body, tag }, supabase);
  if (!push.ok) {
    return { status: 500, error: push.error };
  }

  return { ok: true, push: { sent: push.sent, total: push.total, message: push.message } };
}

