#!/usr/bin/env node
/**
 * Copia todos los datos de prod a dev.
 * Requiere service_role key para ambos (bypasea RLS).
 *
 * Uso:
 *   SUPABASE_PROD_SERVICE_KEY=xxx SUPABASE_DEV_SERVICE_KEY=yyy node scripts/copy-prod-to-dev.js
 *
 * Las keys están en: Dashboard → Settings → API → service_role
 */

const { createClient } = require("@supabase/supabase-js");

const PROD_URL = "https://clgxrxlccjjqxzvapfav.supabase.co";
const DEV_URL = "https://xdiggsdjmmylkvephyod.supabase.co";

const PROD_KEY = process.env.SUPABASE_PROD_SERVICE_KEY;
const DEV_KEY = process.env.SUPABASE_DEV_SERVICE_KEY;

if (!PROD_KEY || !DEV_KEY) {
  console.error("❌ Necesitás SUPABASE_PROD_SERVICE_KEY y SUPABASE_DEV_SERVICE_KEY");
  console.error("   Dashboard → Settings → API → service_role (secret)");
  process.exit(1);
}

const prod = createClient(PROD_URL, PROD_KEY);
const dev = createClient(DEV_URL, DEV_KEY);

// Columnas permitidas por tabla (dev puede tener menos columnas que prod)
const COLS = {
  insumos: ["id", "nombre", "categoria", "presentacion", "precio", "cantidad_presentacion", "unidad", "created_at"],
  recetas: ["id", "nombre", "emoji", "rinde", "unidad_rinde", "precio_venta", "created_at"],
  receta_ingredientes: ["id", "receta_id", "insumo_id", "cantidad", "unidad", "costo_fijo", "created_at"],
  clientes: ["id", "nombre", "telefono", "created_at"],
  ventas: ["id", "receta_id", "cantidad", "precio_unitario", "fecha", "cliente_id", "medio_pago", "estado_pago", "transaccion_id", "created_at"],
  stock: ["receta_id", "cantidad", "updated_at"],
  insumo_stock: ["insumo_id", "cantidad", "updated_at"],
  insumo_movimientos: ["id", "insumo_id", "tipo", "cantidad", "valor", "nota", "created_at"],
};

function pick(row, cols) {
  const out = {};
  for (const c of cols) {
    if (row[c] !== undefined) out[c] = row[c];
  }
  return out;
}

// Orden: primero tablas sin FK, luego las que dependen
const TABLES = [
  "insumos",
  "recetas",
  "receta_ingredientes",
  "clientes",
  "ventas",
  "stock",
  "insumo_stock",
  "insumo_movimientos",
];

// Orden inverso para borrar (por FKs)
const TABLES_TO_CLEAR = [...TABLES].reverse();

async function fetchAll(supabase, table) {
  const pageSize = 1000;
  let from = 0;
  const out = [];
  // Paginación por rango para evitar truncar en tablas grandes
  while (true) {
    const { data, error } = await supabase.from(table).select("*").range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    const rows = data || [];
    out.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

const NIL = "00000000-0000-0000-0000-000000000000";

async function clearTable(supabase, table) {
  let error;
  if (table === "stock") {
    ({ error } = await supabase.from(table).delete().neq("receta_id", NIL));
  } else if (table === "insumo_stock") {
    ({ error } = await supabase.from(table).delete().neq("insumo_id", NIL));
  } else {
    ({ error } = await supabase.from(table).delete().neq("id", NIL));
  }
  if (error) throw new Error(`${table} clear: ${error.message}`);
}

async function insertBatch(supabase, table, rows) {
  if (rows.length === 0) return;
  const cols = COLS[table] || Object.keys(rows[0] || {});
  const filtered = rows.map((r) => pick(r, cols));
  const { error } = await supabase.from(table).insert(filtered);
  if (error) throw new Error(`${table} insert: ${error.message}`);
}

async function main() {
  console.log("📥 Leyendo datos de PROD...");
  const prodData = {};
  for (const table of TABLES) {
    prodData[table] = await fetchAll(prod, table);
    console.log(`   ${table}: ${prodData[table].length} filas`);
  }

  const total = Object.values(prodData).reduce((s, arr) => s + arr.length, 0);
  if (total === 0) {
    console.log("⚠️ No hay datos en prod.");
    process.exit(0);
  }

  console.log("\n🗑️ Limpiando DEV...");
  for (const table of TABLES_TO_CLEAR) {
    await clearTable(dev, table);
    console.log(`   ${table} vacío`);
  }

  console.log("\n📤 Insertando en DEV...");
  for (const table of TABLES) {
    const rows = prodData[table];
    if (rows.length === 0) continue;
    // Insertar en lotes de 100 para evitar timeouts
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      await insertBatch(dev, table, batch);
    }
    console.log(`   ${table}: ${rows.length} filas`);
  }

  console.log("\n✅ Copia completada.");
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
