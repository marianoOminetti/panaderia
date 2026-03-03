#!/usr/bin/env node
/**
 * Importa recetas de recap_import.json a Supabase.
 *
 * Uso:
 *   node scripts/import-recetas.js           # Agrega recetas (puede duplicar)
 *   node scripts/import-recetas.js --clear   # Borra todas las recetas e importa de nuevo
 *   node scripts/import-recetas.js --upsert  # Actualiza existentes o crea nuevas
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const CLEAR = args.includes("--clear");
const UPSERT = args.includes("--upsert");

const SUPABASE_URL = "https://clgxrxlccjjqxzvapfav.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_KEY) {
  console.error("❌ Falta la variable de entorno SUPABASE_KEY (ver docs/AMBIENTES.md).");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Mapeo: nombre en Excel (parcial) → nombre exacto en insumos
const INSUMO_ALIASES = {
  "Premezcla": "Premezcla (casera)",
  "Huevo": "Huevos",
  "Huevo (masa)": "Huevos",
  "Huevos relleno": "Huevos",
  "Harina de Mandioca": "Almidón/Harina de Mandioca",
  "Chocolate Semiamargo (Coverlux)": "Chocolate Semiamargo Coverlux",
  "Chocolate Semiamargo": "Chocolate Semiamargo Coverlux",
  "Dulce de Membrillo": "Membrillo",
  "Puré de tomate": "Puré de Tomate",
  "Puré de tomate (50%)": "Puré de Tomate",
  "Puré de Papas Maggi (2x200g)": "Puré de Papas Maggi",
  "Polenta (2x730g)": "Polenta (Harina de Maíz)",
  "Caja packaging": "Caja Plástica 1500cc",
  "Bolsita packaging": "Bolsa Camiseta",
  "Bolsa (packaging)": "Bolsa Camiseta",
  "Vinagre": "Vinagre de Manzana",
  "Merengue en polvo": "Merengue en Polvo",
};

// Insumos nuevos a crear si no existen (con precio estimado)
const NUEVOS_INSUMOS = [
  { nombre: "Tapas de empanada", categoria: "Condimentos", presentacion: "x 12 u", precio: 3000, cantidad_presentacion: 12, unidad: "u" },
  { nombre: "Rollo Aluminio", categoria: "Packaging", presentacion: "x rollo", precio: 13000, cantidad_presentacion: 240, unidad: "u" },
  { nombre: "Azúcar Impalpable", categoria: "Azúcares", presentacion: "x 250g", precio: 270, cantidad_presentacion: 250, unidad: "g" },
];

function norm(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function matchInsumo(nombreExcel, insumos) {
  const alias = INSUMO_ALIASES[nombreExcel];
  if (alias) {
    const found = insumos.find((i) => norm(i.nombre) === norm(alias));
    if (found) return found;
  }
  const n = norm(nombreExcel);
  for (const ins of insumos) {
    if (norm(ins.nombre) === n) return ins;
    if (n.includes(norm(ins.nombre)) || norm(ins.nombre).includes(n)) return ins;
  }
  return null;
}

async function main() {
  const jsonPath = path.join(__dirname, "..", "recap_import.json");
  const recetas = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  console.log("📦 Cargando insumos existentes...");
  const { data: insumos, error: errIns } = await supabase
    .from("insumos")
    .select("id, nombre, unidad, cantidad_presentacion, precio");
  if (errIns) {
    console.error("Error cargando insumos:", errIns);
    process.exit(1);
  }

  // Insertar insumos nuevos si no existen
  for (const n of NUEVOS_INSUMOS) {
    if (!insumos.find((i) => norm(i.nombre) === norm(n.nombre))) {
      const { data: inserted, error } = await supabase.from("insumos").insert(n).select("id, nombre").single();
      if (error) {
        console.warn("No se pudo insertar", n.nombre, error.message);
      } else {
        insumos.push(inserted);
        console.log("  + Insumo nuevo:", n.nombre);
      }
    }
  }

  // Recargar insumos por si se agregaron
  const { data: insumosFinal } = await supabase.from("insumos").select("id, nombre, unidad, cantidad_presentacion, precio");
  const insList = insumosFinal || insumos;

  // --clear: borrar recetas e ingredientes antes de importar
  if (CLEAR) {
    console.log("🗑️  Borrando recetas existentes...");
    const { data: recetasExistentes } = await supabase.from("recetas").select("id");
    if (recetasExistentes?.length > 0) {
      const ids = recetasExistentes.map((r) => r.id);
      await supabase.from("receta_ingredientes").delete().in("receta_id", ids);
      const { error: errDel } = await supabase.from("recetas").delete().in("id", ids);
      if (errDel) {
        console.error("   Error (¿hay ventas vinculadas?):", errDel.message);
        process.exit(1);
      }
      console.log("   Eliminadas", ids.length, "recetas");
    }
  }

  // Cargar recetas existentes para upsert
  let recetasExistentesMap = {};
  if (UPSERT || CLEAR) {
    const { data: existentes } = await supabase.from("recetas").select("id, nombre");
    recetasExistentesMap = (existentes || []).reduce((acc, r) => {
      acc[norm(r.nombre)] = r;
      return acc;
    }, {});
  }

  let creadas = 0;
  let actualizadas = 0;
  let ingredientesOk = 0;
  let ingredientesSkip = 0;

  for (const rec of recetas) {
    let recetaId;
    const recNorm = norm(rec.nombre);
    const existente = recetasExistentesMap[recNorm];

    if (UPSERT && existente) {
      const { error: errUpd } = await supabase
        .from("recetas")
        .update({
          emoji: rec.emoji || "🍞",
          rinde: rec.rinde,
          unidad_rinde: rec.unidad_rinde || "u",
          precio_venta: rec.precio_venta,
        })
        .eq("id", existente.id);
      if (errUpd) {
        console.warn("⚠️ Error actualizando:", rec.nombre, errUpd.message);
        continue;
      }
      recetaId = existente.id;
      actualizadas++;
      await supabase.from("receta_ingredientes").delete().eq("receta_id", recetaId);
    } else if (existente && !CLEAR) {
      console.warn("⚠️ Receta ya existe (usá --upsert para actualizar):", rec.nombre);
      continue;
    } else {
      const { data: recInserted, error: errRec } = await supabase
        .from("recetas")
        .insert({
          nombre: rec.nombre,
          emoji: rec.emoji || "🍞",
          rinde: rec.rinde,
          unidad_rinde: rec.unidad_rinde || "u",
          precio_venta: rec.precio_venta,
        })
        .select("id")
        .single();
      if (errRec) {
        console.warn("⚠️ Error:", rec.nombre, errRec.message);
        continue;
      }
      recetaId = recInserted.id;
      creadas++;
    }

    const ings = [];
    for (const ing of rec.ingredientes || []) {
      if (ing.costo_fijo != null && ing.costo_fijo > 0) {
        ings.push({
          receta_id: recetaId,
          insumo_id: null,
          cantidad: 0,
          unidad: "g",
          costo_fijo: ing.costo_fijo,
        });
        ingredientesOk++;
        continue;
      }
      if (ing.cantidad == null || ing.cantidad <= 0) continue;

      const insumo = matchInsumo(ing.nombre, insList);
      if (insumo) {
        ings.push({
          receta_id: recetaId,
          insumo_id: insumo.id,
          cantidad: ing.cantidad,
          unidad: ing.unidad || "g",
          costo_fijo: null,
        });
        ingredientesOk++;
      } else {
        ingredientesSkip++;
        console.warn("  ⚠️ Insumo no encontrado:", ing.nombre, "en", rec.nombre);
      }
    }

    if (ings.length > 0) {
      const { error: errIng } = await supabase.from("receta_ingredientes").insert(ings);
      if (errIng) console.warn("  Error ingredientes:", rec.nombre, errIng.message);
    }
  }

  console.log("\n✅ Importación completada:");
  if (creadas > 0) console.log("   Recetas creadas:", creadas);
  if (actualizadas > 0) console.log("   Recetas actualizadas:", actualizadas);
  console.log("   Ingredientes vinculados:", ingredientesOk);
  if (ingredientesSkip > 0) console.log("   Ingredientes omitidos (sin match):", ingredientesSkip);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
