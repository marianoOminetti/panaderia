import { fmt } from "./format";
import { parseDecimal } from "./format";
import { convertirAUnidadInsumo, aGramos } from "./units";
import { costoReceta } from "./costos";

function normId(v) {
  return v === null || v === undefined ? null : String(v);
}

function cantidadPrecursoraAUnidades(cantidad, unidad, gramosPorUnidad) {
  const u = (unidad || "u").toLowerCase();
  if (u === "u") return cantidad;
  const gramos = aGramos(cantidad, unidad);
  const gPu = parseDecimal(gramosPorUnidad);
  if (gPu == null || !Number.isFinite(gPu) || gPu <= 0) return null;
  return gramos / gPu;
}

/** Costo de una fila de insumo según precio/presentación cargados en Insumos. */
export function costoLineaInsumo(ing, insumo) {
  if (!insumo) return null;
  const cant = parseDecimal(ing.cantidad) ?? 0;
  if (cant <= 0) return null;
  const cantidadPresentacion = parseDecimal(insumo.cantidad_presentacion);
  if (!Number.isFinite(cantidadPresentacion) || cantidadPresentacion <= 0) return null;
  const precio = parseDecimal(insumo.precio) ?? 0;
  if (precio <= 0) return null;
  const cantConvertida = convertirAUnidadInsumo(cant, ing.unidad || "g", insumo.unidad, insumo);
  const total = (precio / cantidadPresentacion) * cantConvertida;
  return Number.isFinite(total) ? total : null;
}

function presentacionInsumo(insumo) {
  if (!insumo) return null;
  const precio = parseDecimal(insumo.precio) ?? 0;
  const cant = parseDecimal(insumo.cantidad_presentacion);
  if (!Number.isFinite(cant) || cant <= 0 || precio <= 0) return null;
  return `${fmt(precio)} / ${cant} ${insumo.unidad || "u"}`;
}

function lineaDesdeIngReceta(ri, insumos, recetas, recetaIngredientes, visited) {
  const costoFijo = parseDecimal(ri.costo_fijo);
  if (costoFijo != null && costoFijo > 0) {
    return {
      nombre: "Costo fijo",
      cantidad: null,
      presentacion: null,
      costo: costoFijo,
    };
  }

  if (ri.insumo_id) {
    const insumo = insumos.find((x) => normId(x.id) === normId(ri.insumo_id));
    if (!insumo) return { nombre: "Insumo no encontrado", cantidad: null, presentacion: null, costo: null };
    const cant = parseDecimal(ri.cantidad);
    return {
      nombre: insumo.nombre,
      cantidad: cant != null ? `${cant} ${ri.unidad || insumo.unidad || "g"}` : null,
      presentacion: presentacionInsumo(insumo),
      costo: costoLineaInsumo(ri, insumo),
    };
  }

  if (ri.receta_id_precursora) {
    const sub = recetas.find((r) => normId(r.id) === normId(ri.receta_id_precursora));
    const cant = parseDecimal(ri.cantidad);
    return {
      nombre: sub?.nombre || "Masa precursora",
      cantidad: cant != null ? `${cant} ${ri.unidad || "u"}` : null,
      presentacion: "Sub-masa (ver receta)",
      costo: null,
      esSubPrecursora: true,
      subLineas: sub
        ? aplanarInsumosReceta(sub.id, insumos, recetas, recetaIngredientes, visited)
        : [],
    };
  }

  return null;
}

/** Expande una receta precursora hasta insumos hoja con precios de Insumos. */
export function aplanarInsumosReceta(
  recetaId,
  insumos,
  recetas,
  recetaIngredientes,
  visited = new Set(),
) {
  const id = normId(recetaId);
  if (!id || visited.has(id)) return [];
  visited.add(id);

  const ings = recetaIngredientes.filter((ri) => normId(ri.receta_id) === id);
  const out = [];

  for (const ri of ings) {
    const costoFijo = parseDecimal(ri.costo_fijo);
    if (costoFijo != null && costoFijo > 0) {
      out.push({
        nombre: "Costo fijo",
        cantidad: null,
        presentacion: null,
        costo: costoFijo,
      });
      continue;
    }

    if (ri.insumo_id) {
      const linea = lineaDesdeIngReceta(ri, insumos, recetas, recetaIngredientes, visited);
      if (linea && !linea.esSubPrecursora) out.push(linea);
      continue;
    }

    if (ri.receta_id_precursora) {
      const nested = aplanarInsumosReceta(
        ri.receta_id_precursora,
        insumos,
        recetas,
        recetaIngredientes,
        visited,
      );
      out.push(...nested);
    }
  }

  visited.delete(id);
  return out;
}

/**
 * Detalle para tooltip al hover en «Costo ingrediente» del modal de receta.
 * @returns {{ tipo, costoLinea, titulo, cantidadUsada, presentacion, lineas, rinde } | null}
 */
export function detalleHoverIngrediente(ing, { insumos = [], recetas = [], recetaIngredientes = [] } = {}) {
  if (!ing) return null;

  const costoFijo = parseDecimal(ing.costo_fijo);
  if (costoFijo != null && costoFijo > 0) {
    return {
      tipo: "fijo",
      costoLinea: costoFijo,
      titulo: "Costo fijo",
      cantidadUsada: null,
      presentacion: "Monto manual (no viene de Insumos)",
      lineas: [],
    };
  }

  if (ing.insumo_id) {
    const insumo = insumos.find((x) => normId(x.id) === normId(ing.insumo_id));
    const cant = parseDecimal(ing.cantidad);
    return {
      tipo: "insumo",
      costoLinea: costoLineaInsumo(ing, insumo),
      titulo: insumo?.nombre || "Insumo",
      cantidadUsada: cant != null && cant > 0 ? `${cant} ${ing.unidad || "g"}` : null,
      presentacion: presentacionInsumo(insumo),
      lineas: [],
    };
  }

  if (ing.receta_id_precursora) {
    const prec = recetas.find((r) => normId(r.id) === normId(ing.receta_id_precursora));
    if (!prec) return null;

    const cantRaw = parseDecimal(ing.cantidad) ?? 0;
    const rindeNum = parseDecimal(prec.rinde) ?? 1;
    const rinde = rindeNum > 0 ? rindeNum : 1;
    const cantidadUnidades = cantidadPrecursoraAUnidades(
      cantRaw,
      ing.unidad || "u",
      prec.gramos_por_unidad,
    );

    let costoLinea = null;
    if (cantidadUnidades != null && cantRaw > 0) {
      const costoLotePrec = costoReceta(prec.id, recetaIngredientes, insumos, recetas);
      const costoUnitPrec = rinde > 0 ? costoLotePrec / rinde : 0;
      costoLinea = cantidadUnidades * costoUnitPrec;
      if (!Number.isFinite(costoLinea)) costoLinea = null;
    }

    const lineas = aplanarInsumosReceta(prec.id, insumos, recetas, recetaIngredientes);

    return {
      tipo: "precursora",
      costoLinea,
      titulo: prec.nombre,
      cantidadUsada:
        cantRaw > 0 ? `${cantRaw} ${ing.unidad || "u"} en esta receta` : null,
      presentacion: null,
      rinde: `${rinde} ${prec.unidad_rinde || "u"}`,
      lineas,
    };
  }

  return null;
}
