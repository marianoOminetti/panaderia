#!/usr/bin/env node
/**
 * Pobla la DB con un día de ejemplo variado: ventas, clientes, stock, insumos.
 *
 * Uso: node scripts/seed-dia-ejemplo.js
 */

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://clgxrxlccjjqxzvapfav.supabase.co",
  process.env.SUPABASE_KEY || "sb_publishable__Kgzp453lSnVoHc7A_ZEhg_CvZ6Mo2D"
);

const HOY = new Date().toISOString().split("T")[0];

const CLIENTES_EJEMPLO = [
  { nombre: "María García", telefono: "11 2345-6789" },
  { nombre: "Juan Pérez", telefono: "11 9876-5432" },
  { nombre: "Panadería El Sol", telefono: null },
  { nombre: "Ana Rodríguez", telefono: "11 5555-1234" },
  { nombre: "Carlos López", telefono: null },
  { nombre: "Consumidor final", telefono: null },
];

// Ventas simuladas: [receta_nombre, cantidad, medio_pago, estado_pago, cliente_idx]
// cliente_idx -1 = sin cliente
const VENTAS_EJEMPLO = [
  ["PAN DE MOLDE", 2, "efectivo", "pagado", 0],
  ["TARTA ALMENDRAS S/A", 6, "efectivo", "pagado", -1],
  ["EMPANADA", 12, "efectivo", "pagado", 1],
  ["PREPIZZA", 1, "transferencia", "pagado", 2],
  ["TARTA SALADA", 1, "efectivo", "pagado", 3],
  ["PAN DE MOLDE", 1, "efectivo", "debe", 4],
  ["EMPANADA", 24, "transferencia", "pagado", 2],
  ["TARTA ALMENDRAS S/A", 4, "efectivo", "pagado", -1],
  ["BROWNIE", 3, "efectivo", "pagado", 5],
  ["PREPIZZA", 2, "efectivo", "pagado", 0],
  ["EMPANADA", 6, "efectivo", "pagado", 3],
  ["BUDÍN porción", 2, "transferencia", "pagado", 1],
  ["TARTA ALMENDRAS S/A", 8, "efectivo", "pagado", 4],
  ["EMPANADA", 18, "efectivo", "pagado", 2],
  ["PAN DE MOLDE", 1, "efectivo", "pagado", -1],
];

// Stock de productos: receta_nombre -> cantidad
const STOCK_EJEMPLO = {
  "PAN DE MOLDE": 5,
  "TARTA ALMENDRAS S/A": 20,
  "TARTA SALADA": 3,
  "EMPANADA": 50,
  "PREPIZZA": 8,
  "BROWNIE": 12,
  "BUDÍN porción": 6,
};

// Movimientos de insumos: [insumo_nombre, tipo, cantidad, valor]
const MOVIMIENTOS_INSUMOS = [
  ["Premezcla (casera)", "ingreso", 5000, 8400],
  ["Huevos", "ingreso", 60, 9000],
  ["Harina de Almendras", "ingreso", 500, 10750],
  ["Manteca", "ingreso", 1000, 11794],
  ["Premezcla (casera)", "egreso", 1200, null],
  ["Huevos", "egreso", 15, null],
  ["Levadura", "ingreso", 500, 3200],
  ["Azúcar", "ingreso", 2000, 2060],
  ["Levadura", "egreso", 80, null],
  ["Dulce de Leche", "ingreso", 2000, 2925],
  ["Harina de Almendras", "egreso", 120, null],
  ["Chocolate Semiamargo Coverlux", "ingreso", 800, 10600],
  ["Chocolate Semiamargo Coverlux", "egreso", 400, null],
];

function norm(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function matchReceta(nombre, recetas) {
  const n = norm(nombre);
  return recetas.find((r) => norm(r.nombre) === n || n.includes(norm(r.nombre)));
}

function matchInsumo(nombre, insumos) {
  const n = norm(nombre);
  return insumos.find((i) => norm(i.nombre) === n || n.includes(norm(i.nombre)));
}

async function main() {
  console.log("🌾 Seed día ejemplo -", HOY);
  console.log("");

  // 1. Cargar datos existentes
  const { data: insumos } = await supabase.from("insumos").select("id, nombre");
  const { data: recetas } = await supabase.from("recetas").select("id, nombre, precio_venta");
  if (!insumos?.length || !recetas?.length) {
    console.error("❌ Necesitás insumos y recetas. Ejecutá primero: node scripts/import-recetas.js --upsert");
    process.exit(1);
  }

  // 2. Clientes
  const { data: clientesExistentes } = await supabase.from("clientes").select("id, nombre");
  const clientesMap = new Map((clientesExistentes || []).map((c) => [norm(c.nombre), c]));
  const clientesIds = [];

  for (const c of CLIENTES_EJEMPLO) {
    const key = norm(c.nombre);
    if (clientesMap.has(key)) {
      clientesIds.push(clientesMap.get(key).id);
    } else {
      const { data: nuevo } = await supabase.from("clientes").insert(c).select("id").single();
      if (nuevo) {
        clientesIds.push(nuevo.id);
        clientesMap.set(key, nuevo);
        console.log("  + Cliente:", c.nombre);
      }
    }
  }
  console.log("  Clientes:", clientesIds.length);

  // 3. Ventas

  // Limpiar ventas de hoy para no duplicar
  const { data: ventasHoy } = await supabase.from("ventas").select("id").eq("fecha", HOY);
  if (ventasHoy?.length) {
    const ids = ventasHoy.map((v) => v.id);
    await supabase.from("ventas").delete().in("id", ids);
    console.log("  Ventas de hoy eliminadas:", ids.length);
  }

  const ventasInsert = [];

  for (const [recetaNom, cant, medio, estado, cliIdx] of VENTAS_EJEMPLO) {
    const receta = matchReceta(recetaNom, recetas);
    if (!receta) {
      console.warn("  ⚠ Receta no encontrada:", recetaNom);
      continue;
    }
    const clienteId = cliIdx >= 0 ? clientesIds[cliIdx] : null;
    ventasInsert.push({
      receta_id: receta.id,
      cantidad: cant,
      precio_unitario: receta.precio_venta,
      fecha: HOY,
      cliente_id: clienteId,
      medio_pago: medio,
      estado_pago: estado,
    });
  }

  if (ventasInsert.length) {
    const { error } = await supabase.from("ventas").insert(ventasInsert);
    if (error) {
      const { error: err2 } = await supabase.from("ventas").insert(ventasInsert.map(({ transaccion_id, ...r }) => r));
      if (err2) console.error("  Error ventas:", err2.message);
      else console.log("  Ventas insertadas:", ventasInsert.length);
    } else {
      console.log("  Ventas insertadas:", ventasInsert.length);
    }
  }

  // 4. Stock de productos
  for (const [recetaNom, cant] of Object.entries(STOCK_EJEMPLO)) {
    const receta = matchReceta(recetaNom, recetas);
    if (!receta) continue;
    await supabase.from("stock").upsert(
      { receta_id: receta.id, cantidad: cant, updated_at: new Date().toISOString() },
      { onConflict: "receta_id" }
    );
  }
  console.log("  Stock productos actualizado");

  // 5. Stock y movimientos de insumos
  const insumoStock = {};

  for (const [insumoNom, tipo, cantidad, valor] of MOVIMIENTOS_INSUMOS) {
    const insumo = matchInsumo(insumoNom, insumos);
    if (!insumo) {
      console.warn("  ⚠ Insumo no encontrado:", insumoNom);
      continue;
    }
    const delta = tipo === "ingreso" ? cantidad : -cantidad;
    insumoStock[insumo.id] = (insumoStock[insumo.id] || 0) + delta;

    await supabase.from("insumo_movimientos").insert({
      insumo_id: insumo.id,
      tipo,
      cantidad,
      valor: valor || null,
    });
  }

  for (const [insumoId, cant] of Object.entries(insumoStock)) {
    if (cant > 0) {
      await supabase.from("insumo_stock").upsert(
        { insumo_id: insumoId, cantidad: cant, updated_at: new Date().toISOString() },
        { onConflict: "insumo_id" }
      );
    }
  }
  console.log("  Movimientos insumos:", MOVIMIENTOS_INSUMOS.length);
  console.log("  Stock insumos actualizado");

  console.log("");
  console.log("✅ Listo. Recargá la app para ver el día de hoy poblado.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
