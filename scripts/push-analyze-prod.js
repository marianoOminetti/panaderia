#!/usr/bin/env node
/**
 * Analiza por qué send-push devuelve sent=0: encoding de keys + HTTP status por suscripción.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");
const { buildPushHTTPRequest } = require("@pushforge/builder");

const ROOT = path.resolve(__dirname, "..");
const PROD_REF = "clgxrxlccjjqxzvapfav";
const PROD_URL = `https://${PROD_REF}.supabase.co`;

function serviceKey() {
  const raw = execSync(`supabase projects api-keys --project-ref ${PROD_REF} -o json 2>/dev/null`, {
    encoding: "utf8",
    cwd: ROOT,
  });
  const end = raw.lastIndexOf("]");
  return JSON.parse(raw.slice(0, end + 1)).find((k) => k.name === "service_role").api_key;
}

function loadVapid() {
  const file = path.join(ROOT, ".vapid-keys.local.json");
  if (!fs.existsSync(file)) throw new Error("Falta .vapid-keys.local.json");
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function keyEncodingHint(p256dh) {
  if (!p256dh) return "missing";
  if (p256dh.includes("+") || p256dh.includes("/") || p256dh.endsWith("=")) {
    return "base64-standard (sospechoso)";
  }
  return "base64url (ok)";
}

async function main() {
  const vapid = loadVapid();
  const supabase = createClient(PROD_URL, serviceKey());

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth, updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  console.log("=== Análisis push prod ===\n");
  console.log(`Total suscripciones: ${subs?.length ?? 0}\n`);

  const byEncoding = { url: 0, standard: 0 };
  for (const s of subs || []) {
    const h = keyEncodingHint(s.p256dh);
    if (h.includes("url")) byEncoding.url++;
    else byEncoding.standard++;
  }
  console.log(`Encoding p256dh: base64url=${byEncoding.url}, base64-standard=${byEncoding.standard}\n`);

  const sample = (subs || []).slice(0, 6);
  let ok = 0;
  let fail = 0;
  const statusCounts = {};

  for (const sub of sample) {
    const platform = sub.endpoint.includes("apple")
      ? "Apple"
      : sub.endpoint.includes("mozilla")
        ? "Mozilla"
        : "FCM";
    console.log(`--- ${sub.updated_at} | ${sub.user_id.slice(0, 8)} | ${platform} | ${keyEncodingHint(sub.p256dh)}`);

    try {
      const { endpoint, headers, body } = await buildPushHTTPRequest({
        privateJWK: vapid.privateJWK,
        subscription: {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        message: {
          payload: { title: "Análisis", body: "test", url: "/" },
          adminContact: "mailto:owner@example.com",
        },
      });
      const res = await fetch(endpoint, { method: "POST", headers, body });
      const text = await res.text();
      statusCounts[res.status] = (statusCounts[res.status] || 0) + 1;
      console.log(`    HTTP ${res.status}: ${text.slice(0, 160).replace(/\s+/g, " ")}`);
      if (res.ok || res.status === 201) ok++;
      else fail++;
    } catch (e) {
      console.log(`    ERROR: ${e.message}`);
      fail++;
    }
  }

  console.log("\n=== Resumen muestra ===");
  console.log(`OK: ${ok}, fallos: ${fail}`);
  console.log("Status HTTP:", statusCounts);
  console.log("\nVAPID local publicKey:", vapid.publicKey);
  console.log("Si Vercel ≠ esta clave, las suscripciones del build prod no coinciden con el secret.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
