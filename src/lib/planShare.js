import { DIAS_LARGO, fechaDiaSemanaLabel } from "./planSugerencias";
import { fmt } from "./format";

function sortPlanItems(items) {
  return [...items].sort((a, b) => {
    const ma = a.receta.es_precursora ? 0 : 1;
    const mb = b.receta.es_precursora ? 0 : 1;
    if (ma !== mb) return ma - mb;
    return (a.receta.nombre || "").localeCompare(b.receta.nombre || "", "es");
  });
}

export function planItemsForDay(cartPlanItems, diaIdx) {
  return sortPlanItems(
    (cartPlanItems || []).filter((it) => (it.porDia?.[diaIdx] || 0) > 0),
  ).map((it) => ({
    emoji: it.receta.emoji || "🍞",
    nombre: it.receta.nombre,
    qty: it.porDia[diaIdx] || 0,
    unidad: it.receta.unidad_rinde || "u",
    tipo: it.receta.es_precursora ? "Masa" : "Producto",
  }));
}

export function planDaysForWeek(cartPlanItems, weekStart) {
  return Array.from({ length: 7 }, (_, diaIdx) => {
    const items = planItemsForDay(cartPlanItems, diaIdx);
    if (!items.length) return null;
    return {
      diaIdx,
      dia: DIAS_LARGO[diaIdx],
      fecha: fechaDiaSemanaLabel(weekStart, diaIdx),
      items,
    };
  }).filter(Boolean);
}

export function planDayLabel(weekStart, diaIdx) {
  return {
    dia: DIAS_LARGO[diaIdx],
    fecha: fechaDiaSemanaLabel(weekStart, diaIdx),
  };
}

export function compraGroupsForShare(insumosCompra) {
  const map = new Map();
  for (const item of insumosCompra || []) {
    const proveedor = item.insumo?.proveedor || "Sin proveedor";
    if (!map.has(proveedor)) map.set(proveedor, []);
    map.get(proveedor).push({
      nombre: item.insumo?.nombre || "Insumo",
      faltante: Number(item.faltante) || 0,
      unidad: item.insumo?.unidad || "u",
      costo: Number(item.costo) || 0,
    });
  }
  return [...map.entries()]
    .map(([proveedor, items]) => ({
      proveedor,
      items: items.sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    }))
    .sort((a, b) => a.proveedor.localeCompare(b.proveedor, "es"));
}

export function totalCompraFromItems(insumosCompra) {
  return (insumosCompra || []).reduce((s, x) => s + (Number(x.costo) || 0), 0);
}

export function buildCompraWhatsAppText(insumosCompra, semanaTitulo) {
  const groups = compraGroupsForShare(insumosCompra);
  if (!groups.length) return "Lista de compras vacía para esta semana.";
  let text = `Lista de compras\n${semanaTitulo}\n`;
  for (const { proveedor, items } of groups) {
    text += `\n${proveedor}:\n`;
    for (const it of items) {
      text += `• ${it.nombre}: ${it.faltante.toFixed(2)} ${it.unidad}\n`;
    }
  }
  const total = totalCompraFromItems(insumosCompra);
  if (total > 0) text += `\nEstimado: ${fmt(total)}`;
  return text.trim();
}
