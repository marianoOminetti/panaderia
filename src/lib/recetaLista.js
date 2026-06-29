import { parseDecimal } from "./format";

export const FILTRO_TIPO = {
  TODAS: "todas",
  MASAS: "masas",
  PRODUCTOS: "productos",
};

export const FILTRO_OCULTAS = {
  TODAS: "todas",
  SOLO_OCULTAS: "ocultas",
  SOLO_VISIBLES: "visibles",
};

/** Filtra recetas por búsqueda, tipo (masa/producto) y visibilidad en venta. */
export function filtrarRecetas(recetas, { busqueda = "", tipo = FILTRO_TIPO.TODAS, ocultas = FILTRO_OCULTAS.TODAS } = {}) {
  let list = recetas || [];

  if (tipo === FILTRO_TIPO.MASAS) {
    list = list.filter((r) => !!r.es_precursora);
  } else if (tipo === FILTRO_TIPO.PRODUCTOS) {
    list = list.filter((r) => !r.es_precursora);
  }

  if (ocultas === FILTRO_OCULTAS.SOLO_OCULTAS) {
    list = list.filter((r) => !!r.oculto_en_venta);
  } else if (ocultas === FILTRO_OCULTAS.SOLO_VISIBLES) {
    list = list.filter((r) => !r.oculto_en_venta);
  }

  const q = (busqueda || "").trim().toLowerCase();
  if (q) {
    list = list.filter(
      (r) =>
        (r.nombre || "").toLowerCase().includes(q) ||
        (r.familia || "").toLowerCase().includes(q),
    );
  }

  return list;
}

/**
 * Ingrediente con costo pero sin insumo/masa asignada, o referencia rota.
 */
export function ingredienteConProblema(ing, insumos, recetas) {
  const costoFijo = parseDecimal(ing.costo_fijo);
  const tieneCostoFijo = costoFijo != null && costoFijo > 0;

  if (ing.insumo_id) {
    const ins = (insumos || []).find((x) => String(x.id) === String(ing.insumo_id));
    return ins ? null : "insumo_inexistente";
  }

  if (ing.receta_id_precursora) {
    const prec = (recetas || []).find((x) => String(x.id) === String(ing.receta_id_precursora));
    return prec ? null : "precursora_inexistente";
  }

  if (tieneCostoFijo) return "costo_fijo_sin_nombre";
  return null;
}

/** Recetas con al menos un ingrediente mal configurado. */
export function recetasConIngredientesIncompletos(recetas, recetaIngredientes, insumos, recetasCatalogo) {
  const out = [];
  for (const r of recetas || []) {
    const ings = (recetaIngredientes || []).filter((i) => String(i.receta_id) === String(r.id));
    const problemas = [];
    for (const ing of ings) {
      const tipo = ingredienteConProblema(ing, insumos, recetasCatalogo);
      if (tipo === "costo_fijo_sin_nombre") {
        problemas.push("costo fijo sin insumo/masa asignada");
      } else if (tipo === "insumo_inexistente") {
        problemas.push("insumo eliminado o inexistente");
      } else if (tipo === "precursora_inexistente") {
        problemas.push("masa precursora inexistente");
      }
    }
    if (problemas.length) {
      out.push({ receta: r, problemas: [...new Set(problemas)] });
    }
  }
  return out;
}
