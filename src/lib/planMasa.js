import { aGramos } from "./units";
import { crearPorDiaVacios, NUM_DIAS, sumPorDia, distribuirUniforme } from "./planSugerencias";

function normId(v) {
  return v == null ? null : String(v);
}

/** Gramos que representa 1 unidad del plan (1 lote de la masa). */
export function gramosPorLoteMasa(receta) {
  if (!receta?.es_precursora) return null;
  const gpu = parseFloat(receta.gramos_por_unidad);
  if (Number.isFinite(gpu) && gpu > 0) return gpu;
  const rinde = parseFloat(receta.rinde);
  if (!Number.isFinite(rinde) || rinde <= 0) return null;
  const ur = (receta.unidad_rinde || "u").toLowerCase();
  if (ur === "g") return rinde;
  if (ur === "kg") return rinde * 1000;
  return null;
}

export function usaGramosEnPlanMasa(receta) {
  return gramosPorLoteMasa(receta) != null;
}

/** Convierte cantidad interna del plan (lotes) → gramos para mostrar/editar. */
export function gramosDesdeLotesMasa(receta, lotes) {
  const gpl = gramosPorLoteMasa(receta);
  if (!gpl) return lotes;
  return lotes * gpl;
}

/** Convierte gramos ingresados en UI → lotes internos del plan. */
export function lotesDesdeGramosMasa(receta, gramos) {
  const gpl = gramosPorLoteMasa(receta);
  if (!gpl) return gramos;
  return gramos / gpl;
}

export function formatGramosMasa(gramos) {
  if (gramos >= 1000) {
    const kg = gramos / 1000;
    const valor = Math.round(kg * 10) / 10;
    return { valor, unidad: "kg" };
  }
  return { valor: Math.round(gramos * 10) / 10, unidad: "g" };
}

/** Etiqueta de cantidad para masas en el plan (gramos/kg) o productos (unidad_rinde). */
export function formatCantidadMasaPlan(receta, lotes) {
  if (!receta?.es_precursora || !usaGramosEnPlanMasa(receta)) {
    return { valor: lotes, unidad: receta?.unidad_rinde || "u" };
  }
  return formatGramosMasa(gramosDesdeLotesMasa(receta, lotes));
}

export function etiquetaCantidadMasaPlan(receta, lotes) {
  const { valor, unidad } = formatCantidadMasaPlan(receta, lotes);
  return `${valor} ${unidad}`;
}

export function getProductosDeMasa(masaId, recetaIngredientes, recetas) {
  return getHijosDeMasa(masaId, recetaIngredientes, recetas).filter((r) => !r.es_precursora);
}

/** Recetas (productos o masas hijas) que consumen esta masa como ingrediente. */
export function getHijosDeMasa(masaId, recetaIngredientes, recetas) {
  const id = normId(masaId);
  const ids = new Set();
  for (const ri of recetaIngredientes || []) {
    if (normId(ri.receta_id_precursora) === id && ri.receta_id) ids.add(normId(ri.receta_id));
  }
  return (recetas || []).filter((r) => ids.has(normId(r.id)));
}

export function consumoMasaPorUnidadProducto(productoId, masaId, recetaIngredientes, recetas) {
  return consumoMasaPorUnidadReceta(productoId, masaId, recetaIngredientes, recetas);
}

/** Cuántas unidades de masaPadre consume 1 unidad de recetaHija (producto o masa porcionada). */
export function consumoMasaPorUnidadReceta(recetaHijaId, masaId, recetaIngredientes, recetas) {
  const receta = (recetas || []).find((r) => normId(r.id) === normId(recetaHijaId));
  if (!receta?.rinde) return null;
  const ings = (recetaIngredientes || []).filter(
    (i) => normId(i.receta_id) === normId(recetaHijaId) && normId(i.receta_id_precursora) === normId(masaId),
  );
  if (!ings.length) return 0;
  const prec = (recetas || []).find((r) => normId(r.id) === normId(masaId));
  let total = 0;
  for (const ing of ings) {
    const u = (ing.unidad || "u").toLowerCase();
    const cantRaw = parseFloat(ing.cantidad) || 0;
    let cantUnidades;
    if (u === "u") cantUnidades = cantRaw;
    else {
      const gPu = parseFloat(prec?.gramos_por_unidad) || 0;
      if (gPu <= 0) return null;
      cantUnidades = aGramos(cantRaw, ing.unidad) / gPu;
    }
    total += cantUnidades / (parseFloat(receta.rinde) || 1);
  }
  return total;
}

/** @deprecated alias */
export function consumoMasaPorUnidadMasa(masaHijaId, masaPadreId, recetaIngredientes, recetas) {
  return consumoMasaPorUnidadReceta(masaHijaId, masaPadreId, recetaIngredientes, recetas);
}

function acumularMasaEnMap(masaMap, masa, porDiaDelta) {
  const masaId = normId(masa.id);
  if (!masaMap.has(masaId)) {
    masaMap.set(masaId, { receta: masa, porDia: crearPorDiaVacios(), nivel: 0, padreId: null });
  }
  const entry = masaMap.get(masaId);
  for (let d = 0; d < NUM_DIAS; d++) entry.porDia[d] += porDiaDelta[d] || 0;
}

function porDiaDesdeItem(item) {
  const { cantidad, porDia } = item;
  return porDia && sumPorDia(porDia) > 0 ? porDia : distribuirUniforme(cantidad);
}

/** Propaga necesidad de masas precursoras hacia arriba (masa→masa). */
function propagarNecesidadMasa(receta, porDia, masaMap, recetaIngredientes, recetas, visited) {
  const id = normId(receta?.id);
  if (!id || visited.has(id)) return;
  visited.add(id);
  for (const ing of (recetaIngredientes || []).filter(
    (i) => normId(i.receta_id) === id && i.receta_id_precursora,
  )) {
    const masaId = normId(ing.receta_id_precursora);
    const consumo = consumoMasaPorUnidadReceta(receta.id, masaId, recetaIngredientes, recetas);
    if (consumo == null || consumo <= 0) continue;
    const masa = (recetas || []).find((r) => normId(r.id) === masaId);
    if (!masa) continue;
    const pd = porDia.map((n) => n * consumo);
    acumularMasaEnMap(masaMap, masa, pd);
    propagarNecesidadMasa(masa, pd, masaMap, recetaIngredientes, recetas, visited);
  }
  visited.delete(id);
}

/**
 * Calcula masas necesarias desde productos y masas planificadas, con rollup recursivo.
 * @returns {Array<{ receta, porDia, cantidad, nivel?, padreId? }>}
 */
export function calcularMasasNecesarias(items, recetaIngredientes, recetas) {
  const masaMap = new Map();
  for (const item of items || []) {
    const { receta } = item;
    if (!receta) continue;
    const pd = porDiaDesdeItem(item);
    if (receta.es_precursora) {
      acumularMasaEnMap(masaMap, receta, pd);
      propagarNecesidadMasa(receta, pd, masaMap, recetaIngredientes, recetas, new Set());
      continue;
    }
    for (const ing of (recetaIngredientes || []).filter(
      (i) => normId(i.receta_id) === normId(receta.id) && i.receta_id_precursora,
    )) {
      const masaId = normId(ing.receta_id_precursora);
      const consumo = consumoMasaPorUnidadReceta(receta.id, masaId, recetaIngredientes, recetas);
      if (consumo == null || consumo <= 0) continue;
      const masa = (recetas || []).find((r) => normId(r.id) === masaId);
      if (!masa) continue;
      const pdMasa = pd.map((n) => n * consumo);
      acumularMasaEnMap(masaMap, masa, pdMasa);
      propagarNecesidadMasa(masa, pdMasa, masaMap, recetaIngredientes, recetas, new Set());
    }
  }
  return [...masaMap.values()].map((e) => {
    const porDia = e.porDia.map((x) => Math.ceil(x * 10) / 10);
    return {
      receta: e.receta,
      porDia,
      cantidad: Math.ceil(sumPorDia(porDia) * 10) / 10,
      nivel: e.nivel,
      padreId: e.padreId,
    };
  });
}

export function calcularMasasDesdeProductos(items, recetaIngredientes, recetas) {
  const productos = (items || []).filter((it) => it.receta && !it.receta.es_precursora);
  return calcularMasasNecesarias(productos, recetaIngredientes, recetas);
}

export function clasificarMasasCalculadas(masasCalculadas, recetaIngredientes) {
  const base = [];
  const porcionadas = [];
  for (const m of masasCalculadas || []) {
    const ings = (recetaIngredientes || []).filter(
      (i) => normId(i.receta_id) === normId(m.receta?.id) && i.receta_id_precursora,
    );
    if (ings.length) porcionadas.push(m);
    else base.push(m);
  }
  return { base, porcionadas };
}

/** Compara masas planificadas vs necesarias según productos del plan. */
export function evaluarCoberturaMasas(cartPlanItems, recetaIngredientes, recetas) {
  const productos = (cartPlanItems || []).filter((it) => it.receta && !it.receta.es_precursora);
  if (!productos.length) {
    return { alertas: [], faltantePorDia: crearPorDiaVacios(), recetasIncompletas: [], ok: true };
  }

  const necesarias = calcularMasasNecesarias(productos, recetaIngredientes, recetas);
  const planificadasMap = new Map();
  for (const it of cartPlanItems || []) {
    if (it.receta?.es_precursora) planificadasMap.set(normId(it.receta.id), it);
  }

  const alertas = [];
  const faltantePorDia = crearPorDiaVacios();

  for (const nec of necesarias) {
    const id = normId(nec.receta.id);
    const plan = planificadasMap.get(id);
    const planificadoLotes = plan ? (plan.cantidad ?? sumPorDia(plan.porDia || [])) : 0;
    const faltanteLotes = Math.max(0, Math.round((nec.cantidad - planificadoLotes) * 10) / 10);
    const fmtNec = formatCantidadMasaPlan(nec.receta, nec.cantidad);
    const fmtPlan = formatCantidadMasaPlan(nec.receta, planificadoLotes);
    const fmtFalt = formatCantidadMasaPlan(nec.receta, faltanteLotes);

    if (faltanteLotes > 0 || !plan) {
      alertas.push({
        receta: nec.receta,
        necesarioLabel: etiquetaCantidadMasaPlan(nec.receta, nec.cantidad),
        planificadoLabel: etiquetaCantidadMasaPlan(nec.receta, planificadoLotes),
        faltanteLabel: etiquetaCantidadMasaPlan(nec.receta, faltanteLotes),
        necesarioTotal: fmtNec.valor,
        planificadoTotal: fmtPlan.valor,
        faltanteTotal: fmtFalt.valor,
        faltanteLotes,
        unidad: fmtNec.unidad,
        sinPlanificar: !plan,
      });
    }
  }

  const recetasIncompletas = [];
  const seen = new Set();
  for (const item of productos) {
    for (const ing of (recetaIngredientes || []).filter(
      (i) => normId(i.receta_id) === normId(item.receta.id) && i.receta_id_precursora,
    )) {
      const key = `${normId(item.receta.id)}:${normId(ing.receta_id_precursora)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const consumo = consumoMasaPorUnidadProducto(
        item.receta.id, ing.receta_id_precursora, recetaIngredientes, recetas,
      );
      if (consumo === null) {
        const masa = (recetas || []).find((r) => normId(r.id) === normId(ing.receta_id_precursora));
        recetasIncompletas.push({ producto: item.receta, masa });
      }
    }
  }

  return {
    alertas,
    faltantePorDia,
    recetasIncompletas,
    ok: alertas.length === 0 && recetasIncompletas.length === 0,
  };
}

export function infoProductosHijos(masaId, recetaIngredientes, recetas, ventas, semanaInicioISO, ventasRecetaFn) {
  return getProductosDeMasa(masaId, recetaIngredientes, recetas).map((p) => ({
    receta: p,
    consumoPorUnidad: consumoMasaPorUnidadProducto(p.id, masaId, recetaIngredientes, recetas),
    vendidoSemanaAnterior: ventasRecetaFn(ventas, p.id, semanaInicioISO),
  }));
}
