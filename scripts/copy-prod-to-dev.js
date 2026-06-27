#!/usr/bin/env node
/**
 * Copia datos de prod → dev (solo datos, no estructura).
 * Requiere service_role en ambos proyectos (bypasea RLS).
 *
 * Uso:
 *   npm run copy:prod-to-dev
 *   npm run copy:prod-to-dev -- --preset=plan
 *   SUPABASE_PROD_SERVICE_KEY=xxx SUPABASE_DEV_SERVICE_KEY=yyy node scripts/copy-prod-to-dev.js
 *
 * Con supabase login, lee las service_role keys automáticamente.
 */

const { execSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const PROD_URL = "https://clgxrxlccjjqxzvapfav.supabase.co";
const DEV_URL = "https://xdiggsdjmmylkvephyod.supabase.co";
const PROD_REF = "clgxrxlccjjqxzvapfav";
const DEV_REF = "xdiggsdjmmylkvephyod";

function serviceKeyFromCli(projectRef, envVar) {
  if (process.env[envVar]) return process.env[envVar];
  try {
    const raw = execSync(
      `supabase projects api-keys --project-ref ${projectRef} -o json 2>/dev/null`,
      { encoding: "utf8" },
    );
    const end = raw.lastIndexOf("]");
    const keys = JSON.parse(raw.slice(0, end + 1));
    return keys.find((k) => k.name === "service_role")?.api_key || null;
  } catch {
    return null;
  }
}

const PROD_KEY = serviceKeyFromCli(PROD_REF, "SUPABASE_PROD_SERVICE_KEY");
const DEV_KEY = serviceKeyFromCli(DEV_REF, "SUPABASE_DEV_SERVICE_KEY");

if (!PROD_KEY || !DEV_KEY) {
  console.error("❌ Necesitás SUPABASE_PROD_SERVICE_KEY y SUPABASE_DEV_SERVICE_KEY");
  console.error("   O ejecutá: supabase login");
  console.error("   Dashboard → Settings → API → service_role");
  process.exit(1);
}

const prod = createClient(PROD_URL, PROD_KEY);
const dev = createClient(DEV_URL, DEV_KEY);

const PRESETS = {
  /** Recetas, masas, ventas y plan — suficiente para probar plan semanal */
  plan: [
    "insumos",
    "recetas",
    "insumo_composicion",
    "receta_ingredientes",
    "clientes",
    "promociones",
    "promocion_recetas",
    "ventas",
    "stock",
    "insumo_stock",
    "plan_semanal",
  ],
  /** Catálogo + operación diaria (sin facturas ni push) */
  core: [
    "insumos",
    "recetas",
    "insumo_composicion",
    "receta_ingredientes",
    "clientes",
    "ventas",
    "stock",
    "insumo_stock",
    "insumo_movimientos",
    "plan_semanal",
    "precio_historial",
    "gastos_fijos",
    "pedidos",
    "promociones",
    "promocion_recetas",
  ],
};

function parsePreset() {
  const hit = process.argv.find((a) => a.startsWith("--preset="));
  if (!hit) return PRESETS.core;
  const name = hit.slice("--preset=".length);
  if (!PRESETS[name]) {
    console.error(`❌ Preset desconocido: ${name}. Opciones: ${Object.keys(PRESETS).join(", ")}`);
    process.exit(1);
  }
  return PRESETS[name];
}

const TABLES = parsePreset();
const TABLES_TO_CLEAR = [...TABLES].reverse();

function pick(row, cols) {
  if (!cols) return row;
  const out = {};
  for (const c of cols) {
    if (row[c] !== undefined) out[c] = row[c];
  }
  return out;
}

async function columnsFromOpenApi(table) {
  const res = await fetch(`${DEV_URL}/rest/v1/`, {
    headers: { apikey: DEV_KEY, Authorization: `Bearer ${DEV_KEY}` },
  });
  if (!res.ok) return null;
  const spec = await res.json();
  const props =
    spec.definitions?.[table]?.properties ||
    spec.components?.schemas?.[table]?.properties;
  return props ? Object.keys(props) : null;
}

async function devColumnKeys(table) {
  const { data, error } = await dev.from(table).select("*").limit(1);
  if (error) throw new Error(`${table} dev schema: ${error.message}`);
  if (data?.[0]) return Object.keys(data[0]);
  return columnsFromOpenApi(table);
}

async function resolveInsertColumns(table, sampleRow) {
  const fromDev = await devColumnKeys(table);
  if (fromDev?.length) return fromDev;

  if (!sampleRow) return columnsFromOpenApi(table) || [];

  let keys = Object.keys(sampleRow);
  for (;;) {
    const row = pick(sampleRow, keys);
    const { error } = await dev.from(table).insert([row]);
    if (!error) {
      if (table === "stock") {
        await dev.from(table).delete().eq("receta_id", row.receta_id);
      } else if (table === "insumo_stock") {
        await dev.from(table).delete().eq("insumo_id", row.insumo_id);
      } else {
        await dev.from(table).delete().eq("id", row.id);
      }
      return keys;
    }
    const miss = error.message.match(/Could not find the '([^']+)' column/);
    if (miss) {
      keys = keys.filter((k) => k !== miss[1]);
      if (!keys.length) throw new Error(`${table}: sin columnas compatibles con dev`);
      continue;
    }
    throw new Error(`${table} probe: ${error.message}`);
  }
}

async function fetchAll(supabase, table) {
  const pageSize = 1000;
  let from = 0;
  const out = [];
  while (true) {
    const { data, error } = await supabase.from(table).select("*").range(from, from + pageSize - 1);
    if (error) throw new Error(`${table} read: ${error.message}`);
    const rows = data || [];
    out.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

const NIL = "00000000-0000-0000-0000-000000000000";

const COMPOSITE_PK = {
  promocion_recetas: "promocion_id",
};

async function clearTable(supabase, table) {
  let error;
  if (table === "stock") {
    ({ error } = await supabase.from(table).delete().neq("receta_id", NIL));
  } else if (table === "insumo_stock") {
    ({ error } = await supabase.from(table).delete().neq("insumo_id", NIL));
  } else if (COMPOSITE_PK[table]) {
    ({ error } = await supabase.from(table).delete().neq(COMPOSITE_PK[table], NIL));
  } else {
    ({ error } = await supabase.from(table).delete().neq("id", NIL));
  }
  if (error) throw new Error(`${table} clear: ${error.message}`);
}

async function insertBatch(supabase, table, rows, cols) {
  if (rows.length === 0) return;
  const payload = cols ? rows.map((r) => pick(r, cols)) : rows;
  const { error } = await supabase.from(table).insert(payload);
  if (error) throw new Error(`${table} insert: ${error.message}`);
}

async function main() {
  const presetArg = process.argv.find((a) => a.startsWith("--preset="));
  console.log(`📋 Preset: ${presetArg ? presetArg.slice(9) : "core"}`);
  console.log(`   Tablas: ${TABLES.join(", ")}\n`);

  console.log("📥 Leyendo datos de PROD...");
  const prodData = {};
  for (const table of TABLES) {
    prodData[table] = await fetchAll(prod, table);
    console.log(`   ${table}: ${prodData[table].length} filas`);
  }

  const total = Object.values(prodData).reduce((s, arr) => s + arr.length, 0);
  if (total === 0) {
    console.log("⚠️ No hay datos en prod para esas tablas.");
    process.exit(0);
  }

  console.log("🔍 Resolviendo columnas compatibles con DEV...");
  const devCols = {};
  for (const table of TABLES) {
    const sample = prodData[table]?.[0];
    devCols[table] = await resolveInsertColumns(table, sample);
    if (devCols[table].length) {
      console.log(`   ${table}: ${devCols[table].length} columnas`);
    }
  }

  console.log("\n🗑️ Limpiando DEV (solo esas tablas)...");
  for (const table of TABLES_TO_CLEAR) {
    await clearTable(dev, table);
    console.log(`   ${table} vacío`);
  }

  console.log("\n📤 Insertando en DEV...");
  for (const table of TABLES) {
    const rows = prodData[table];
    if (rows.length === 0) continue;
    const cols = devCols[table];
    if (!cols?.length) {
      console.log(`   ${table}: omitida (sin columnas)`);
      continue;
    }
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      await insertBatch(dev, table, rows.slice(i, i + batchSize), cols);
    }
    console.log(`   ${table}: ${rows.length} filas`);
  }

  console.log("\n✅ Copia completada.");
  console.log("   Recordá: usuarios Auth no se copian — usá tu login de dev.");
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
