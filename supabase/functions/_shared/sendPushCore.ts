import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildPushHTTPRequest } from "npm:@pushforge/builder@latest";

export type SendPushInput = {
  userIds?: string[];
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export type SendPushResult =
  | { ok: true; sent: number; total: number; message: string }
  | { ok: false; status: number; error: string };

function parseVapidJwk(): { ok: true; jwk: unknown } | { ok: false } {
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!vapidPrivateKey) {
    console.error("[send-push] VAPID_PRIVATE_KEY not set");
    return { ok: false };
  }
  try {
    return { ok: true, jwk: JSON.parse(vapidPrivateKey) };
  } catch {
    console.error("[send-push] VAPID_PRIVATE_KEY must be JWK JSON");
    return { ok: false };
  }
}

export async function executeSendPush(
  reqBody: SendPushInput,
  supabase?: SupabaseClient,
): Promise<SendPushResult> {
  if (!reqBody.title || typeof reqBody.body !== "string") {
    return { ok: false, status: 400, error: "Missing title or body" };
  }

  const vapid = parseVapidJwk();
  if (!vapid.ok) {
    return { ok: false, status: 500, error: "Server misconfiguration: VAPID not set" };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRoleKey) {
    return { ok: false, status: 500, error: "Server misconfiguration" };
  }

  const db = supabase ?? createClient(supabaseUrl, serviceRoleKey);

  let query = db.from("push_subscriptions").select("user_id, endpoint, p256dh, auth");
  if (reqBody.userIds?.length) {
    query = query.in("user_id", reqBody.userIds);
  }
  const { data: subs, error: subsError } = await query;
  if (subsError) {
    console.error("[send-push] push_subscriptions", subsError);
    return { ok: false, status: 500, error: "Failed to fetch subscriptions" };
  }

  if (!subs?.length) {
    return { ok: true, sent: 0, total: 0, message: "No subscriptions" };
  }

  const payload: Record<string, string> = {
    title: reqBody.title,
    body: reqBody.body,
    url: reqBody.url || "/",
  };
  const pushId = reqBody.tag?.trim() || crypto.randomUUID();
  const adminContact = Deno.env.get("PUSH_ADMIN_CONTACT") || "mailto:owner@example.com";

  let sent = 0;
  for (const sub of subs) {
    try {
      const { endpoint, headers, body } = await buildPushHTTPRequest({
        privateJWK: vapid.jwk as any,
        subscription: {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        message: { payload, adminContact },
      });

      const res = await fetch(endpoint, { method: "POST", headers, body });

      if (res.ok || res.status === 201) {
        sent += 1;
      } else if (res.status === 404 || res.status === 410) {
        console.warn("[send-push] subscription gone", sub.user_id, res.status, pushId);
        await db.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      } else {
        const text = await res.text().catch(() => "");
        console.error("[send-push] push failed", sub.user_id, res.status, pushId, text);
      }
    } catch (e) {
      console.error("[send-push] per-sub error", sub.user_id, e);
    }
  }

  const total = subs.length;
  return {
    ok: true,
    sent,
    total,
    message:
      sent === total
        ? `Sent ${sent} of ${total}`
        : `Sent ${sent} of ${total} (some failures, see logs)`,
  };
}
