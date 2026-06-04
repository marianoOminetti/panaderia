#!/usr/bin/env node
/**
 * Envía una notificación push de prueba en producción (sin cargar ventas).
 *
 * Requiere service_role de prod (nunca commitear):
 *
 *   SUPABASE_PROD_SERVICE_KEY=eyJ... npm run push:test:prod
 *
 * O copiá .env.push.local.example → .env.push.local y:
 *
 *   npm run push:test:prod
 *
 * Opciones:
 *   --list              Solo listar suscripciones, no enviar
 *   --user=<uuid>       Enviar solo a ese user_id
 *   --title="..."       Título personalizado
 *   --body="..."        Cuerpo personalizado
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const PROD_URL = "https://clgxrxlccjjqxzvapfav.supabase.co";
const ROOT = path.resolve(__dirname, "..");

function loadEnvPushLocal() {
  const file = path.join(ROOT, ".env.push.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function argValue(flag) {
  const pref = `${flag}=`;
  const hit = process.argv.find((a) => a.startsWith(pref));
  return hit ? hit.slice(pref.length) : null;
}

loadEnvPushLocal();

const PROD_REF = "clgxrxlccjjqxzvapfav";

function serviceKeyFromSupabaseCli() {
  if (process.env.SUPABASE_PROD_SERVICE_KEY) return process.env.SUPABASE_PROD_SERVICE_KEY;
  try {
    const raw = execSync(
      `supabase projects api-keys --project-ref ${PROD_REF} -o json 2>/dev/null`,
      { encoding: "utf8", cwd: ROOT },
    );
    const end = raw.lastIndexOf("]");
    const keys = JSON.parse(raw.slice(0, end + 1));
    const row = keys.find((k) => k.name === "service_role");
    return row?.api_key || null;
  } catch {
    return null;
  }
}

const PROD_KEY = serviceKeyFromSupabaseCli();
const listOnly = process.argv.includes("--list");
const userId = argValue("--user");
const title = argValue("--title") || "Prueba push · Panadería";
const body =
  argValue("--body") ||
  `Test ${new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}`;

if (!PROD_KEY) {
  console.error("❌ Falta SUPABASE_PROD_SERVICE_KEY");
  console.error("   Opciones:");
  console.error("   · supabase login + npm run push:test:prod (lee service_role con CLI)");
  console.error("   · .env.push.local desde .env.push.local.example");
  process.exit(1);
}

const supabase = createClient(PROD_URL, PROD_KEY);

async function listSubscriptions() {
  let query = supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, updated_at")
    .order("updated_at", { ascending: false });

  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function main() {
  console.log("=== Push test (prod) ===\n");

  const subs = await listSubscriptions();
  console.log(`Suscripciones${userId ? ` (user ${userId})` : ""}: ${subs.length}`);
  for (const row of subs) {
    const ep = row.endpoint?.includes("fcm")
      ? "FCM (Chrome/Android)"
      : row.endpoint?.includes("mozilla")
        ? "Mozilla"
        : row.endpoint?.slice(0, 40) || "?";
    console.log(`  · ${row.user_id} | ${ep} | ${row.updated_at}`);
  }

  if (!subs.length) {
    console.log("\n⚠️  No hay suscripciones. En la app: Más → Activar notificaciones.");
    process.exit(1);
  }

  if (listOnly) return;

  console.log("\nEnviando push de prueba…");
  const payload = {
    title,
    body,
    url: "/?tab=mas",
    tag: `test-${Date.now()}`,
  };
  if (userId) payload.userIds = [userId];

  const { data, error } = await supabase.functions.invoke("send-push", { body: payload });

  if (error) {
    console.error("❌ invoke send-push:", error.message);
    process.exit(1);
  }

  console.log("Respuesta:", JSON.stringify(data, null, 2));

  const sent = data?.sent ?? 0;
  const total = data?.total ?? subs.length;

  if (sent > 0) {
    console.log(`\n✅ Enviado a ${sent} de ${total} dispositivo(s). Revisá el teléfono/PWA.`);
    return;
  }

  console.log("\n❌ sent=0 — revisá logs de send-push en Supabase y VAPID en Vercel.");
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
