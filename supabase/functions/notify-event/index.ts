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

type NotifyBody =
  | {
      type: "venta";
      payload: { transaccion_id?: string; venta_ids?: string[] };
    }
  | {
      type: "stock_zero";
      payload: { receta_id: string };
    }
  | {
      type: "ingreso_mercaderia";
      payload: { insumo_id?: string; movimiento_id?: string; cantidad?: number };
    };

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
    if (body.type === "venta") {
      const result = await handleVenta(body.payload, supabaseAdmin);
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

async function handleVenta(
  payload: { transaccion_id?: string; venta_ids?: string[] },
  supabase: ReturnType<typeof createClient>,
) {
  const { transaccion_id, venta_ids } = payload || {};

  if (!transaccion_id && (!venta_ids || !Array.isArray(venta_ids) || !venta_ids.length)) {
    return { status: 400, error: "venta payload must include transaccion_id or venta_ids" };
  }

  // Traer ventas del grupo
  let query = supabase
    .from("ventas")
    .select("id, total_final, precio_unitario, cantidad, cliente_id, estado_pago, transaccion_id");

  if (transaccion_id) {
    query = query.eq("transaccion_id", transaccion_id);
  } else if (venta_ids?.length) {
    query = query.in("id", venta_ids);
  }

  const { data: ventas, error } = await query;
  if (error) {
    console.error("[notify-event] ventas query", error);
    return { status: 500, error: "Failed to load ventas" };
  }
  if (!ventas || ventas.length === 0) {
    return { status: 404, error: "No ventas found for event" };
  }

  // Calcular monto total de la transacción
  const montoVenta = (v: any) =>
    v.total_final != null
      ? Number(v.total_final)
      : (Number(v.precio_unitario) || 0) * (Number(v.cantidad) || 0);

  const total = ventas.reduce((s: number, v: any) => s + montoVenta(v), 0);

  const fmt = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

  const title = `Venta ${fmt.format(total)}`;

  // Cliente: tomar el primero; si no hay, Consumidor final
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

  const tieneDeuda = ventas.some((v: any) => v.estado_pago === "debe");
  const estadoTxt = tieneDeuda ? "Debe" : "Pagado";
  const body = `${clienteNombre} · ${estadoTxt}`;

  const grupoKey =
    ventas[0]?.transaccion_id || ventas[0]?.id || transaccion_id || (venta_ids && venta_ids[0]);

  const url = grupoKey ? `/?tab=ventas&venta=${encodeURIComponent(grupoKey)}` : "/?tab=ventas";

  const { data, error: pushError } = await supabase.functions.invoke("send-push", {
    body: { title, body, url },
  });

  if (pushError) {
    console.error("[notify-event] send-push error", pushError);
    return { status: 500, error: "Failed to send push", push: data };
  }

  return { ok: true, push: data };
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

  const { data, error: pushError } = await supabase.functions.invoke("send-push", {
    body: { title, body },
  });

  if (pushError) {
    console.error("[notify-event] send-push error", pushError);
    return { status: 500, error: "Failed to send push", push: data };
  }

  return { ok: true, push: data };
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

  const { data, error: pushError } = await supabase.functions.invoke("send-push", {
    body: { title, body },
  });

  if (pushError) {
    console.error("[notify-event] send-push error", pushError);
    return { status: 500, error: "Failed to send push", push: data };
  }

  return { ok: true, push: data };
}

