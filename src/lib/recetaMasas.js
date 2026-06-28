import { aGramos } from "./units";
import { TIPO_RECETA } from "./recetaTipo";

/** Ingredientes de insumo (no precursora ni costo fijo) elegibles para extraer como masa. */
export function ingredientesExtraibles(ingredientes = []) {
  return ingredientes
    .map((ing, idx) => ({ ing, idx }))
    .filter(({ ing }) => ing.insumo_id && !ing.receta_id_precursora);
}

/** Gramos totales de una lista de ingredientes del formulario. */
export function sumGramosIngredientes(ingredientes = [], indices = null) {
  const list = indices ? indices.map((i) => ingredientes[i]).filter(Boolean) : ingredientes;
  let total = 0;
  for (const ing of list) {
    const cant = parseFloat(ing.cantidad);
    if (!Number.isFinite(cant) || cant <= 0) continue;
    const g = aGramos(cant, ing.unidad || "g");
    if (Number.isFinite(g) && g > 0) total += g;
  }
  return total;
}

/**
 * Arma payloads para extraer masa desde un producto.
 * @returns {{ masaPayload, masaIngredientes, productoIngredientes, gramosMasaPorUnidadProducto }}
 */
export function buildExtraerMasa({
  productoForm,
  ingredientes,
  indicesMasa,
  nombreMasa,
  familia,
  gramosPorUnidadProducto,
  emojiMasa = "🍞",
}) {
  const idxSet = new Set(indicesMasa);
  const masaIngredientes = ingredientes
    .filter((_, i) => idxSet.has(i))
    .map((i) => ({ ...i }));
  const restantes = ingredientes
    .filter((_, i) => !idxSet.has(i))
    .map((i) => ({ ...i }));

  const gramos =
    parseFloat(gramosPorUnidadProducto) ||
    sumGramosIngredientes(ingredientes, indicesMasa);

  const masaPayload = {
    nombre: (nombreMasa || "Masa").trim().toUpperCase(),
    emoji: emojiMasa || productoForm.emoji || "🍞",
    rinde: 1,
    unidad_rinde: "u",
    precio_venta: 0,
    es_precursora: true,
    gramos_por_unidad: gramos > 0 ? gramos : null,
    oculto_en_venta: true,
    familia: familia || productoForm.familia || null,
  };

  const productoIngredientes = [
    {
      insumo_id: "",
      receta_id_precursora: "__PENDING_MASA__",
      cantidad: String(gramos > 0 ? gramos : 1),
      unidad: "g",
      costo_fijo: "",
    },
    ...restantes,
  ];

  return {
    masaPayload,
    masaIngredientes,
    productoIngredientes,
    gramosMasaPorUnidadProducto: gramos,
  };
}

/** Payloads para masas porcionadas hijas de una masa base. */
export function buildPorcionesMasa({ masaBase, gramosList = [] }) {
  const baseNombre = (masaBase.nombre || "Masa").trim();
  const familia = masaBase.familia || null;
  return gramosList
    .map((g) => parseFloat(g))
    .filter((g) => Number.isFinite(g) && g > 0)
    .map((gramos) => ({
      nombre: `${baseNombre} ${gramos}G`.toUpperCase(),
      emoji: masaBase.emoji || "🍞",
      rinde: 1,
      unidad_rinde: "u",
      precio_venta: 0,
      es_precursora: true,
      gramos_por_unidad: gramos,
      oculto_en_venta: true,
      familia,
      ingredientes: [
        {
          insumo_id: "",
          receta_id_precursora: masaBase.id,
          cantidad: String(gramos),
          unidad: "g",
          costo_fijo: "",
        },
      ],
    }));
}

/** Copia de producto como nueva variante (misma familia y estructura). */
export function buildVarianteDesdeProducto({
  producto,
  ingredientes,
  nuevoNombre,
  familia,
}) {
  return {
    form: {
      nombre: (nuevoNombre || `Variante de ${producto.nombre}`).trim(),
      emoji: producto.emoji || "🍞",
      rinde: String(producto.rinde ?? 1),
      unidad_rinde: producto.unidad_rinde || "u",
      precio_venta: producto.precio_venta != null ? String(producto.precio_venta) : "",
      es_precursora: false,
      gramos_por_unidad: "",
      oculto_en_venta: !!producto.oculto_en_venta,
      familia: familia || producto.familia || "",
      tipo_receta: TIPO_RECETA.PRODUCTO,
    },
    ingredientes: ingredientes.map((i) => ({ ...i })),
  };
}
