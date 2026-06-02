/**
 * Edge Function: send-push
 *
 * Envía notificaciones Web Push a usuarios. Debe ser invocada SOLO desde el backend
 * (otra Edge Function con service role, o trigger/worker), nunca por el cliente.
 *
 * Body: { userIds?: string[], title: string, body: string, url?: string, tag?: string }
 * - userIds: opcional; si no se envía, se envían a todos los usuarios con fila en push_subscriptions.
 * - url: ej. "/?tab=ventas&venta=KEY" para deep link al hacer clic.
 *
 * Secrets (Supabase Dashboard → Project Settings → Edge Functions → Secrets):
 * - VAPID_PRIVATE_KEY: clave privada VAPID (generar con npx web-push generate-vapid-keys)
 *
 * Invocación desde otra Edge Function (service role):
 *   const { data, error } = await supabaseAdmin.functions.invoke('send-push', { body: { title, body, url } })
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildPushHTTPRequest } from "npm:@pushforge/builder@latest";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!vapidPrivateKey) {
    console.error("[send-push] VAPID_PRIVATE_KEY not set");
    return new Response(
      JSON.stringify({ error: "Server misconfiguration: VAPID not set" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let vapidJwk: unknown;
  try {
    vapidJwk = JSON.parse(vapidPrivateKey);
  } catch {
    console.error("[send-push] VAPID_PRIVATE_KEY must be a JWK JSON string (see PUSH_VAPID_Y_DEPLOY.md)");
    return new Response(
      JSON.stringify({ error: "Invalid VAPID key format" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Server misconfiguration" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let reqBody: { userIds?: string[]; title: string; body: string; url?: string; tag?: string };
  try {
    reqBody = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!reqBody.title || typeof reqBody.body !== "string") {
    return new Response(
      JSON.stringify({ error: "Missing title or body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let query = supabase.from("push_subscriptions").select("user_id, endpoint, p256dh, auth");
  if (reqBody.userIds?.length) {
    query = query.in("user_id", reqBody.userIds);
  }
  const { data: subs, error: subsError } = await query;
  if (subsError) {
    console.error("[send-push] push_subscriptions", subsError);
    return new Response(
      JSON.stringify({ error: "Failed to fetch subscriptions" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!subs?.length) {
    return new Response(
      JSON.stringify({ sent: 0, message: "No subscriptions" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const payload = {
    title: reqBody.title,
    body: reqBody.body,
    url: reqBody.url || "/",
    tag: reqBody.tag || "panaderia-push",
  };

  const adminContact = Deno.env.get("PUSH_ADMIN_CONTACT") || "mailto:owner@example.com";

  let sent = 0;
  for (const sub of subs) {
    try {
      const subscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      const { endpoint, headers, body } = await buildPushHTTPRequest({
        privateJWK: vapidJwk as any,
        subscription,
        message: {
          payload,
          adminContact,
        },
      });

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body,
      });

      if (res.ok || res.status === 201) {
        sent += 1;
      } else if (res.status === 404 || res.status === 410) {
        console.warn("[send-push] subscription gone", sub.user_id, res.status);
        // Opcional: borrar suscripción de la tabla push_subscriptions
      } else {
        const text = await res.text().catch(() => "");
        console.error("[send-push] push failed", sub.user_id, res.status, text);
      }
    } catch (e) {
      console.error("[send-push] per-sub error", sub.user_id, e);
    }
  }

  return new Response(
    JSON.stringify({
      sent,
      total: subs.length,
      message:
        sent === subs.length
          ? `Sent ${sent} of ${subs.length}`
          : `Sent ${sent} of ${subs.length} (some failures, see logs)`,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
