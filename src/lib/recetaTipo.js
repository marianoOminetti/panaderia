/** Tipos derivados de receta para UI (no columna en DB). */
export const TIPO_RECETA = {
  MASA_BASE: "masa_base",
  MASA_PORCIONADA: "masa_porcionada",
  PRODUCTO: "producto",
};

const TIPO_LABELS = {
  [TIPO_RECETA.MASA_BASE]: "Masa base",
  [TIPO_RECETA.MASA_PORCIONADA]: "Masa porcionada",
  [TIPO_RECETA.PRODUCTO]: "Producto",
};

export function getTipoReceta(receta, recetaIngredientes = []) {
  if (!receta?.es_precursora) return TIPO_RECETA.PRODUCTO;
  const ings = (recetaIngredientes || []).filter(
    (i) => String(i.receta_id) === String(receta.id),
  );
  const usaMasa = ings.some((i) => i.receta_id_precursora);
  return usaMasa ? TIPO_RECETA.MASA_PORCIONADA : TIPO_RECETA.MASA_BASE;
}

export function getTipoRecetaLabel(tipo) {
  return TIPO_LABELS[tipo] || "Producto";
}

export function esMasa(receta) {
  return !!receta?.es_precursora;
}

export function getMasaBasePadreId(recetaId, recetaIngredientes = []) {
  const ing = (recetaIngredientes || []).find(
    (i) => String(i.receta_id) === String(recetaId) && i.receta_id_precursora,
  );
  return ing?.receta_id_precursora ?? null;
}

export function productoUsaPrecursora(recetaId, recetaIngredientes = []) {
  return (recetaIngredientes || []).some(
    (i) => String(i.receta_id) === String(recetaId) && i.receta_id_precursora,
  );
}

export function collectFamilias(recetas = []) {
  const set = new Set();
  for (const r of recetas) {
    const f = (r.familia || "").trim();
    if (f) set.add(f);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
}

export function groupProductosPorFamilia(productos = []) {
  const grupos = new Map();
  for (const r of productos) {
    const key = (r.familia || "").trim() || "__sin_familia__";
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key).push(r);
  }
  const sorted = [...grupos.entries()].sort(([a], [b]) => {
    if (a === "__sin_familia__") return 1;
    if (b === "__sin_familia__") return -1;
    return a.localeCompare(b, "es", { sensitivity: "base" });
  });
  return sorted.map(([key, items]) => ({
    familia: key === "__sin_familia__" ? null : key,
    items: items.sort((a, b) =>
      (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" }),
    ),
  }));
}

export function applyTipoRecetaToForm(tipo, prevForm = {}) {
  if (tipo === TIPO_RECETA.PRODUCTO) {
    return { ...prevForm, es_precursora: false };
  }
  return {
    ...prevForm,
    es_precursora: true,
    oculto_en_venta: prevForm.oculto_en_venta ?? true,
  };
}

export function tipoFromForm(form, ingredientes = []) {
  if (!form?.es_precursora) return TIPO_RECETA.PRODUCTO;
  const usaMasa = (ingredientes || []).some((i) => i.receta_id_precursora);
  return usaMasa ? TIPO_RECETA.MASA_PORCIONADA : TIPO_RECETA.MASA_BASE;
}
