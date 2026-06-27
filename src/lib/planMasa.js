import { aGramos } from "./units";
import { crearPorDiaVacios, NUM_DIAS, sumPorDia, distribuirUniforme } from "./planSugerencias";

function normId(v) {
  return v == null ? null : String(v);
}

export function getProductosDeMasa(masaId, recetaIngredientes, recetas) {
  const id = normId(masaId);
  const ids = new Set();
  for (const ri of recetaIngredientes || []) {
    if (normId(ri.receta_id_precursora) === id && ri.receta_id) ids.add(normId(ri.receta_id));
  }
  return (recetas || []).filter((r) => ids.has(normId(r.id)) && !r.es_precursora);
}

export function consumoMasaPorUnidadProducto(productoId, masaId, recetaIngredientes, recetas) {
  const producto = (recetas || []).find((r) => normId(r.id) === normId(productoId));
  if (!producto?.rinde) return null;
  const ings = (recetaIngredientes || []).filter(
    (i) => normId(i.receta_id) === normId(productoId) && normId(i.receta_id_precursora) === normId(masaId),
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
    total += cantUnidades / (parseFloat(producto.rinde) || 1);
  }
  return total;
}

export function calcularMasasDesdeProductos(items, recetaIngredientes, recetas) {
  const masaMap = new Map();
  for (const item of items || []) {
    const { receta, cantidad, porDia } = item;
    if (!receta || receta.es_precursora) continue;
    for (const ing of (recetaIngredientes || []).filter(
      (i) => normId(i.receta_id) === normId(receta.id) && i.receta_id_precursora,
    )) {
      const masaId = normId(ing.receta_id_precursora);
      const consumo = consumoMasaPorUnidadProducto(receta.id, masaId, recetaIngredientes, recetas);
      if (consumo == null || consumo <= 0) continue;
      const masa = (recetas || []).find((r) => normId(r.id) === masaId);
      if (!masa) continue;
      if (!masaMap.has(masaId)) masaMap.set(masaId, { receta: masa, porDia: crearPorDiaVacios() });
      const pd = porDia && sumPorDia(porDia) > 0 ? porDia : distribuirUniforme(cantidad);
      for (let d = 0; d < NUM_DIAS; d++) masaMap.get(masaId).porDia[d] += pd[d] * consumo;
    }
  }
  return [...masaMap.values()].map((e) => {
    const porDia = e.porDia.map((x) => Math.ceil(x * 10) / 10);
    return { receta: e.receta, porDia, cantidad: Math.ceil(sumPorDia(porDia) * 10) / 10 };
  });
}

/** Compara masas planificadas vs necesarias según productos del plan. */
export function evaluarCoberturaMasas(cartPlanItems, recetaIngredientes, recetas) {
  const productos = (cartPlanItems || []).filter((it) => it.receta && !it.receta.es_precursora);
  if (!productos.length) {
    return { alertas: [], faltantePorDia: crearPorDiaVacios(), recetasIncompletas: [], ok: true };
  }

  const necesarias = calcularMasasDesdeProductos(productos, recetaIngredientes, recetas);
  const planificadasMap = new Map();
  for (const it of cartPlanItems || []) {
    if (it.receta?.es_precursora) planificadasMap.set(normId(it.receta.id), it);
  }

  const alertas = [];
  const faltantePorDia = crearPorDiaVacios();

  for (const nec of necesarias) {
    const id = normId(nec.receta.id);
    const plan = planificadasMap.get(id);
    const unidad = nec.receta.unidad_rinde || "u";
    const planificadoTotal = plan ? (plan.cantidad ?? sumPorDia(plan.porDia || [])) : 0;
    const faltanteTotal = Math.max(0, Math.round((nec.cantidad - planificadoTotal) * 10) / 10);

    if (faltanteTotal > 0 || !plan) {
      alertas.push({
        receta: nec.receta,
        unidad,
        necesarioTotal: nec.cantidad,
        planificadoTotal,
        faltanteTotal,
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
