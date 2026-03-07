#!/usr/bin/env node
/**
 * Agrega muchas ventas de diferentes clientes para probar el paginado de
 * "Clientes del día" en Analytics.
 *
 * Crea 25 clientes y 25 ventas (una por cliente) para hoy.
 * Con 10 por página = 3 páginas para probar.
 *
 * Uso: SUPABASE_KEY=xxx node scripts/seed-ventas-paginacion.js
 */

const { createClient } = require("@supabase/supabase-js");

// Usa REACT_APP_* del .env o SUPABASE_* en línea
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.REACT_APP_SUPABASE_URL ||
  "https://clgxrxlccjjqxzvapfav.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
  console.error(
    "❌ Falta SUPABASE_KEY. Uso: SUPABASE_KEY=xxx node scripts/seed-ventas-paginacion.js"
  );
  console.error(
    "   O configurá REACT_APP_SUPABASE_ANON_KEY en .env.development y ejecutá: npm run seed:paginacion"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const HOY = new Date().toISOString().split("T")[0];

const NOMBRES_CLIENTES = [
  "María García",
  "Juan Pérez",
  "Panadería El Sol",
  "Ana Rodríguez",
  "Carlos López",
  "Laura Martínez",
  "Roberto Fernández",
  "Claudia Sánchez",
  "Diego González",
  "Patricia Díaz",
  "Miguel Torres",
  "Sofía Ramírez",
  "Andrés Flores",
  "Valentina Romero",
  "Lucas Herrera",
  "Camila Castro",
  "Martín Ruiz",
  "Lucía Morales",
  "Nicolás Ortiz",
  "Emma Vargas",
  "Santiago Jiménez",
  "Isabella Mendoza",
  "Mateo Silva",
  "Victoria Ríos",
  "Benjamín Vega",
];

function norm(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

async function main() {
  console.log("🌾 Seed ventas para paginación -", HOY);
  console.log("");

  const { data: recetas } = await supabase
    .from("recetas")
    .select("id, nombre, precio_venta");
  if (!recetas?.length) {
    console.error("❌ Necesitás recetas. Ejecutá primero import-recetas.");
    process.exit(1);
  }
  const receta = recetas[0];

  const { data: clientesExistentes } = await supabase
    .from("clientes")
    .select("id, nombre");
  const clientesMap = new Map(
    (clientesExistentes || []).map((c) => [norm(c.nombre), c])
  );
  const clientesIds = [];

  for (const nombre of NOMBRES_CLIENTES) {
    const key = norm(nombre);
    if (clientesMap.has(key)) {
      clientesIds.push(clientesMap.get(key).id);
    } else {
      const { data: nuevo } = await supabase
        .from("clientes")
        .insert({ nombre })
        .select("id")
        .single();
      if (nuevo) {
        clientesIds.push(nuevo.id);
        clientesMap.set(key, nuevo);
        console.log("  + Cliente:", nombre);
      }
    }
  }
  console.log("  Clientes disponibles:", clientesIds.length);

  const ventasInsert = [];
  for (let i = 0; i < clientesIds.length; i++) {
    const cantidad = 1 + (i % 3);
    const precio = receta.precio_venta || 1000;
    ventasInsert.push({
      receta_id: receta.id,
      cantidad,
      precio_unitario: precio,
      total_final: cantidad * precio,
      fecha: HOY,
      cliente_id: clientesIds[i],
      medio_pago: "efectivo",
      estado_pago: "pagado",
    });
  }

  const { error } = await supabase.from("ventas").insert(ventasInsert);
  if (error) {
    console.error("  Error insertando ventas:", error.message);
    process.exit(1);
  }

  console.log("  Ventas insertadas:", ventasInsert.length);
  console.log("");
  console.log("✅ Listo. Abrí Analytics → Hoy → Clientes del día para probar la paginación.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
