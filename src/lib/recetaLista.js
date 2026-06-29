import { fmt, parseDecimal } from "./format";

function nombreKey(nombre) {
  return (nombre ?? "").trim().toLowerCase();
}

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

  const cantidad = parseDecimal(ing.cantidad);
  if (cantidad != null && cantidad > 0) return "sin_asignar";

  return null;
}

/** Texto legible del problema en un ingrediente (para la card en modo Revisar). */
export function mensajeProblemaIngrediente(ing, insumos, recetas) {
  const tipo = ingredienteConProblema(ing, insumos, recetas);
  if (!tipo) return null;

  if (tipo === "costo_fijo_sin_nombre") {
    const monto = parseDecimal(ing.costo_fijo);
    return monto != null && monto > 0
      ? `${fmt(monto)} de costo fijo sin insumo/masa asignada`
      : "Costo fijo sin insumo/masa asignada";
  }

  if (tipo === "insumo_inexistente") {
    return "Insumo eliminado o inexistente";
  }

  if (tipo === "precursora_inexistente") {
    const prec = (recetas || []).find((x) => String(x.id) === String(ing.receta_id_precursora));
    const nombre = (prec?.nombre || "").trim();
    return nombre
      ? `Masa «${nombre}» inexistente o eliminada`
      : "Masa precursora inexistente o eliminada";
  }

  if (tipo === "sin_asignar") {
    const cantidad = parseDecimal(ing.cantidad);
    const unidad = (ing.unidad || "g").trim();
    return cantidad != null && cantidad > 0
      ? `Ingrediente ${cantidad} ${unidad} sin insumo/masa asignada`
      : "Ingrediente sin insumo/masa asignada";
  }

  return null;
}

/** Cuenta recetas por nombre exacto (normalizado). */
export function contarRecetasPorNombre(recetas) {
  const counts = new Map();
  for (const r of recetas || []) {
    const key = nombreKey(r.nombre);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

export function nombreEsCopiaDe(nombre) {
  return nombreKey(nombre).startsWith("copia de");
}

/** Problemas de la receta (ingredientes, nombre, etc.) para modo Revisar. */
export function problemasReceta(r, recetaIngredientes, insumos, recetasCatalogo, duplicadosPorNombre) {
  const problemas = [];
  const ings = (recetaIngredientes || []).filter((i) => String(i.receta_id) === String(r.id));

  if (ings.length === 0) {
    problemas.push("Sin ingredientes cargados");
  } else {
    for (const ing of ings) {
      const msg = mensajeProblemaIngrediente(ing, insumos, recetasCatalogo);
      if (msg) problemas.push(msg);
    }
  }

  const key = nombreKey(r.nombre);
  const nombre = (r.nombre || "").trim();
  if (key) {
    const veces = duplicadosPorNombre?.get(key) || 0;
    if (veces > 1) {
      problemas.push(`Nombre duplicado (${veces} recetas con «${nombre}»)`);
    }
    if (nombreEsCopiaDe(r.nombre)) {
      problemas.push("Nombre sin renombrar (Copia de…)");
    }
  }

  return problemas;
}

/** Recetas con al menos un problema para revisar. */
export function recetasParaRevisar(recetas, recetaIngredientes, insumos, recetasCatalogo) {
  const duplicadosPorNombre = contarRecetasPorNombre(recetasCatalogo || recetas);
  const out = [];
  for (const r of recetas || []) {
    const problemas = problemasReceta(r, recetaIngredientes, insumos, recetasCatalogo, duplicadosPorNombre);
    if (problemas.length) out.push({ receta: r, problemas });
  }
  return out;
}

/** @deprecated Usar recetasParaRevisar */
export function recetasConIngredientesIncompletos(recetas, recetaIngredientes, insumos, recetasCatalogo) {
  return recetasParaRevisar(recetas, recetaIngredientes, insumos, recetasCatalogo);
}
