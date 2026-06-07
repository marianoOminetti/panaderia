#!/usr/bin/env node
/**
 * Lista y elimina promos duplicadas en prod (mismo nombre+tipo+descuento_fijo).
 * Conserva la más antigua de cada grupo.
 *
 *   node scripts/limpiar_promos_duplicadas_prod.js --dry-run
 *   node scripts/limpiar_promos_duplicadas_prod.js --apply
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const PROD_URL = "https://clgxrxlccjjqxzvapfav.supabase.co";
const PROD_REF = "clgxrxlccjjqxzvapfav";
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

loadEnvPushLocal();

function serviceKey() {
  if (process.env.SUPABASE_PROD_SERVICE_KEY) return process.env.SUPABASE_PROD_SERVICE_KEY;
  try {
    const raw = execSync(
      `supabase projects api-keys --project-ref ${PROD_REF} -o json 2>/dev/null`,
      { encoding: "utf8", cwd: ROOT },
    );
    const end = raw.lastIndexOf("]");
    const keys = JSON.parse(raw.slice(0, end + 1));
    return keys.find((k) => k.name === "service_role")?.api_key || null;
  } catch {
    return null;
  }
}

const apply = process.argv.includes("--apply");
const dryRun = !apply || process.argv.includes("--dry-run");

async function main() {
  const key = serviceKey();
  if (!key) {
    console.error("❌ Falta SUPABASE_PROD_SERVICE_KEY o supabase login");
    process.exit(1);
  }
  const supabase = createClient(PROD_URL, key);

  const { data: promos, error } = await supabase
    .from("promociones")
    .select("id, nombre, tipo, descuento_fijo, activa, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;

  console.log(`\n📋 ${promos.length} promos en prod\n`);
  for (const p of promos.slice(-10)) {
    console.log(
      `  ${p.created_at?.slice(0, 19)} | ${p.nombre} | ${p.tipo} | $${p.descuento_fijo ?? "-"} | ${p.id}`,
    );
  }

  const groups = new Map();
  for (const p of promos) {
    const k = `${(p.nombre || "").trim()}|${p.tipo}|${p.descuento_fijo ?? ""}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(p);
  }

  const toDelete = [];
  for (const [, rows] of groups) {
    if (rows.length < 2) continue;
    const sorted = [...rows].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at),
    );
    const keep = sorted[0];
    const dups = sorted.slice(1);
    console.log(`\n🔁 Duplicado: "${keep.nombre}" (${keep.tipo}) — conservar ${keep.id}`);
    for (const d of dups) {
      console.log(`   🗑️  eliminar ${d.id} (${d.created_at})`);
      toDelete.push(d.id);
    }
  }

  if (toDelete.length === 0) {
    console.log("\n✅ No hay duplicados exactos por nombre+tipo+descuento_fijo\n");
    return;
  }

  if (dryRun && !apply) {
    console.log(`\n⚠️  Dry-run: ${toDelete.length} promo(s) a borrar. Corré con --apply para ejecutar.\n`);
    return;
  }

  for (const id of toDelete) {
    const { error: linkErr } = await supabase
      .from("promocion_recetas")
      .delete()
      .eq("promocion_id", id);
    if (linkErr) throw linkErr;
    const { error: delErr } = await supabase.from("promociones").delete().eq("id", id);
    if (delErr) throw delErr;
    console.log(`✅ Eliminada ${id}`);
  }
  console.log(`\n✅ Listo: ${toDelete.length} duplicado(s) removido(s)\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
