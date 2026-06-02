#!/usr/bin/env node
/**
 * Asigna rol en public.user_roles a usuarios de Auth que aún no tienen fila.
 * Requiere service_role (bypasea RLS en user_roles).
 *
 * Uso:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_KEY=service_role node scripts/bootstrap-user-roles.js
 *   SUPABASE_KEY=xxx node scripts/bootstrap-user-roles.js --role venta --email vendedor@ejemplo.com
 *
 * Sin --email: todos los usuarios sin rol reciben --role (default: admin).
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = val;
  }
}

loadEnvFile(path.join(__dirname, "..", ".env.development.local"));
loadEnvFile(path.join(__dirname, "..", ".env.local"));

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const args = process.argv.slice(2);
let targetRole = "admin";
let targetEmail = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--role" && args[i + 1]) {
    targetRole = args[++i];
  } else if (args[i] === "--email" && args[i + 1]) {
    targetEmail = args[++i];
  }
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "❌ Configurá SUPABASE_URL y SUPABASE_KEY (service_role) o REACT_APP_SUPABASE_URL en .env.development.local",
  );
  process.exit(1);
}

if (!["admin", "venta"].includes(targetRole)) {
  console.error("❌ --role debe ser admin o venta");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function listAllUsers() {
  const users = [];
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    users.push(...(data?.users || []));
    if ((data?.users || []).length < perPage) break;
    page += 1;
  }
  return users;
}

async function main() {
  const users = await listAllUsers();
  if (users.length === 0) {
    console.log("No hay usuarios en Auth.");
    return;
  }

  const targets = targetEmail
    ? users.filter((u) => u.email?.toLowerCase() === targetEmail.toLowerCase())
    : users;

  if (targetEmail && targets.length === 0) {
    console.error(`❌ No existe usuario con email ${targetEmail}`);
    process.exit(1);
  }

  const { data: existing, error: existingErr } = await supabase
    .from("user_roles")
    .select("user_id, role");
  if (existingErr) throw existingErr;

  const byUser = new Map((existing || []).map((r) => [r.user_id, r.role]));

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const u of targets) {
    const hasRole = byUser.has(u.id);
    if (!targetEmail && hasRole) {
      skipped += 1;
      continue;
    }
    const { error } = await supabase.from("user_roles").upsert(
      {
        user_id: u.id,
        role: targetRole,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw error;
    if (hasRole) updated += 1;
    else inserted += 1;
    console.log(`✓ ${u.email || u.id} → ${targetRole}`);
  }

  console.log(
    `\nListo. insertados=${inserted}, actualizados=${updated}, omitidos(sin --email)=${skipped}`,
  );
}

main().catch((err) => {
  console.error("❌", err.message || err);
  process.exit(1);
});
