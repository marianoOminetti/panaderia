/**
 * Motor de insights: detecta puntos ciegos cruzando ventas, stock, márgenes, clientes y precios.
 * Usado por Dashboard (card Insights). Prioriza urgente > atención > oportunidad.
 */
import { costoUnitarioPorRecetaMap } from "./costos";
import { gruposConDeuda, totalDebeEnGrupo } from "./agrupadores";
import { calcularMetricasVentasYStock } from "./metrics";
import { parseDecimal, pctFmt } from "./format";
import { METRICAS_VENTANA_DIAS } from "../config/appConfig";
import {
  indexVentasPorCliente,
  buildPerfilFromVentas,
} from "./clienteMetrics";

export const MARGEN_OBJETIVO = 0.6;
export const INSIGHTS_MAX_VISIBLE = 3;

const MS_POR_DIA = 24 * 60 * 60 * 1000;
const SEVERITY_ORDER = { urgent: 0, attention: 1, opportunity: 2 };

function parseISODate(d) {
  if (!d) return null;
  const parts = String(d).split("-");
  if (parts.length === 3) {
    const [y, m, day] = parts.map((x) => parseInt(x, 10));
    if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(day)) {
      return new Date(y, m - 1, day);
    }
  }
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function startOfWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(start) {
  const d = new Date(start);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function weekRange(offsetWeeks, hoy = new Date()) {
  const base = startOfWeek(hoy);
  const start = new Date(base.getTime() + offsetWeeks * 7 * MS_POR_DIA);
  return { start, end: endOfWeek(start) };
}

function isBetween(date, from, to) {
  return date && date.getTime() >= from.getTime() && date.getTime() <= to.getTime();
}

function unidadesPorRecetaEnRango(ventas, from, to) {
  const map = new Map();
  for (const v of ventas || []) {
    const fecha = parseISODate(v.fecha || v.created_at);
    if (!fecha || !isBetween(fecha, from, to) || v.receta_id == null) continue;
    const rid = v.receta_id;
    map.set(rid, (map.get(rid) || 0) + (Number(v.cantidad) || 0));
  }
  return map;
}

function margenReceta(receta, costoUnitario) {
  const precio = parseDecimal(receta?.precio_venta);
  if (precio == null || precio <= 0 || costoUnitario == null) return null;
  return (precio - costoUnitario) / precio;
}

function recetasQueUsanInsumo(recetaIngredientes, insumoId) {
  const target = String(insumoId);
  const ids = new Set();
  for (const ing of recetaIngredientes || []) {
    if (ing.insumo_id != null && String(ing.insumo_id) === target) {
      ids.add(ing.receta_id);
    }
  }
  return ids;
}

function insightMargenBajo(recetas, costoUnitarioPorReceta) {
  const bajas = (recetas || []).filter((r) => {
    const m = margenReceta(r, costoUnitarioPorReceta[r.id]);
    return m != null && m < MARGEN_OBJETIVO;
  });
  if (!bajas.length) return null;

  const nombres = bajas.slice(0, 3).map((r) => r.nombre).join(", ");
  const extra = bajas.length > 3 ? ` y ${bajas.length - 3} más` : "";

  return {
    id: "margen-bajo",
    severity: "urgent",
    title: `${bajas.length} receta${bajas.length > 1 ? "s" : ""} bajo el margen objetivo`,
    body: `${nombres}${extra} — objetivo ${pctFmt(MARGEN_OBJETIVO)}.`,
    action: "Revisar precios",
    navigateTo: "recetas",
    score: bajas.length,
  };
}

function insightSubaInsumo(
  recetas,
  recetaIngredientes,
  insumos,
  costoUnitarioPorReceta,
  precioHistorial,
) {
  const hace30 = Date.now() - 30 * MS_POR_DIA;
  const subas = (precioHistorial || []).filter((h) => {
    const fecha = h.fecha ? new Date(h.fecha).getTime() : 0;
    const ant = Number(h.precio_anterior);
    const nuevo = Number(h.precio_nuevo);
    if (!fecha || fecha < hace30 || !ant || ant <= 0 || !nuevo) return false;
    return (nuevo - ant) / ant >= 0.15;
  });
  if (!subas.length) return null;

  const afectadas = new Set();
  let mejorSuba = null;
  for (const h of subas) {
    const ant = Number(h.precio_anterior);
    const nuevo = Number(h.precio_nuevo);
    const pct = (nuevo - ant) / ant;
    for (const rid of recetasQueUsanInsumo(recetaIngredientes, h.insumo_id)) {
      const m = margenReceta(
        recetas.find((r) => r.id === rid),
        costoUnitarioPorReceta[rid],
      );
      if (m != null && m < MARGEN_OBJETIVO) afectadas.add(rid);
    }
    if (!mejorSuba || pct > mejorSuba.pct) {
      mejorSuba = { ...h, pct };
    }
  }
  if (!afectadas.size || !mejorSuba) return null;

  const insumoRow = (insumos || []).find(
    (i) => String(i.id) === String(mejorSuba.insumo_id),
  );
  const insumoNombre = insumoRow?.nombre || mejorSuba.motivo || "un insumo";

  return {
    id: "suba-insumo-margen",
    severity: "urgent",
    title: "Suba de insumo comió margen",
    body: `${insumoNombre} subió ${pctFmt(mejorSuba.pct)}. ${afectadas.size} receta${afectadas.size > 1 ? "s" : ""} quedaron bajo el ${pctFmt(MARGEN_OBJETIVO)}.`,
    action: "Ver recetas afectadas",
    navigateTo: "recetas",
    score: afectadas.size * 10 + mejorSuba.pct,
  };
}

function insightCaidaSostenida(ventas, recetas, hoy = new Date()) {
  const w1 = weekRange(-1, hoy);
  const w2 = weekRange(-2, hoy);
  const w3 = weekRange(-3, hoy);
  const u1 = unidadesPorRecetaEnRango(ventas, w1.start, w1.end);
  const u2 = unidadesPorRecetaEnRango(ventas, w2.start, w2.end);
  const u3 = unidadesPorRecetaEnRango(ventas, w3.start, w3.end);

  const caidas = [];
  for (const r of recetas || []) {
    const a = u1.get(r.id) || 0;
    const b = u2.get(r.id) || 0;
    const c = u3.get(r.id) || 0;
    if (c < 5) continue;
    if (b < c * 0.9 && a < b * 0.9) {
      caidas.push({ receta: r, c, b, a });
    }
  }
  if (!caidas.length) return null;

  caidas.sort((x, y) => y.c - x.c);
  const top = caidas[0];
  const mas = caidas.length > 1 ? ` (+${caidas.length - 1} más)` : "";

  return {
    id: "caida-sostenida",
    severity: "attention",
    title: "Ventas en baja 3 semanas seguidas",
    body: `${top.receta.nombre}: ${top.c} → ${top.b} → ${top.a} unidades (3 semanas cerradas)${mas}. Revisá producción o precio.`,
    action: "Ver Analytics",
    navigateTo: "analytics",
    score: top.c,
  };
}

function insightStockAgotandose(ventas, recetas, stock) {
  const metricas = calcularMetricasVentasYStock(
    recetas,
    ventas,
    stock,
    METRICAS_VENTANA_DIAS,
  );

  const riesgos = [];
  for (const r of recetas || []) {
    const m = metricas[r.id];
    if (!m || m.promedioDiario <= 0 || (m.totalVentana || 0) < 5) continue;
    const dias = m.diasRestantes;
    if (dias == null || dias >= 2) continue;
    if ((m.stockActual ?? 0) <= 0) continue;
    riesgos.push({ receta: r, dias, promedio: m.promedioDiario, stockActual: m.stockActual });
  }
  if (!riesgos.length) return [];

  riesgos.sort((a, b) => a.dias - b.dias);

  return riesgos.map(({ receta, dias, promedio, stockActual }) => {
    const diasLabel = Math.max(0, Math.floor(dias));
    const sugerido = Math.max(1, Math.ceil(promedio * 3));
    return {
      id: `stock-critico-${receta.id}`,
      severity: dias < 1 ? "urgent" : "attention",
      title: `${receta.nombre} se agota pronto`,
      body: `Stock ${stockActual ?? 0} u · ritmo ${promedio.toFixed(1)}/día · ~${diasLabel} día${diasLabel === 1 ? "" : "s"} restante${diasLabel === 1 ? "" : "s"}.`,
      action: "Cargar stock",
      actionType: "stock_quick_edit",
      recetaId: receta.id,
      suggestedQty: sugerido,
      score: 100 - dias * 20,
    };
  });
}

function insightSinStock(recetas, stock) {
  const enCero = (recetas || []).filter((r) => ((stock || {})[r.id] ?? 0) <= 0);
  if (!enCero.length) return [];

  return enCero.map((receta) => ({
    id: `sin-stock-${receta.id}`,
    severity: "urgent",
    title: `${receta.nombre} sin stock`,
    body: "No quedan unidades disponibles para vender.",
    action: "Cargar stock",
    actionType: "stock_quick_edit",
    recetaId: receta.id,
    suggestedQty: 1,
    score: 200,
  }));
}

function insightClientesNuevos(ventas, clientes, recetas, hoy = new Date()) {
  const ventasPorCliente = indexVentasPorCliente(ventas);
  const insights = [];

  for (const c of clientes || []) {
    const vs = ventasPorCliente.get(c.id) ?? [];
    const perfil = buildPerfilFromVentas(vs, recetas, c, hoy);
    if (!perfil.esNuevo) continue;
    const fav = perfil.favoritos[0]?.receta?.nombre;
    insights.push({
      id: `cliente-nuevo-${c.id}`,
      severity: "opportunity",
      title: `Cliente nuevo: ${c.nombre}`,
      body: `${perfil.compras} compra${perfil.compras > 1 ? "s" : ""} en los últimos 30 días${fav ? ` · le gusta ${fav}` : ""}.`,
      action: "Ver Clientes",
      navigateTo: "clientes",
      score: perfil.compras * 10,
    });
  }
  return insights;
}

function insightClienteInactivo(ventas, clientes, recetas, hoy = new Date()) {
  const ventasPorCliente = indexVentasPorCliente(ventas);
  const inactivos = [];

  for (const c of clientes || []) {
    const vs = ventasPorCliente.get(c.id) ?? [];
    const perfil = buildPerfilFromVentas(vs, recetas, c, hoy);
    if (!perfil.inactivo) continue;
    inactivos.push({
      cliente: c,
      comprasPrevias: perfil.compras,
      dias: perfil.diasDesdeUltima,
    });
  }
  if (!inactivos.length) return [];

  inactivos.sort((a, b) => b.comprasPrevias - a.comprasPrevias);

  return inactivos.map(({ cliente, comprasPrevias, dias }) => ({
    id: `cliente-inactivo-${cliente.id}`,
    severity: "attention",
    title: `${cliente.nombre} dejó de venir`,
    body: `No compra hace ${dias} días (${comprasPrevias} compras antes).`,
    action: "Ver Clientes",
    navigateTo: "clientes",
    score: comprasPrevias,
  }));
}

function insightDeudaVieja(ventas, hoy = new Date()) {
  const limite = new Date(hoy.getTime() - 14 * MS_POR_DIA);
  const grupos = gruposConDeuda(ventas || []);
  const viejos = grupos.filter((g) => {
    const ref = g.rawItems?.[0]?.fecha || g.rawItems?.[0]?.created_at;
    const fecha = parseISODate(ref);
    return fecha && fecha < limite;
  });
  if (!viejos.length) return null;

  const total = viejos.reduce((s, g) => s + totalDebeEnGrupo(g), 0);
  const masViejo = viejos.reduce((best, g) => {
    const ref = g.rawItems?.[0]?.fecha || g.rawItems?.[0]?.created_at;
    const fecha = parseISODate(ref);
    if (!fecha) return best;
    if (!best || fecha < best.fecha) {
      return { fecha };
    }
    return best;
  }, null);

  const dias =
    masViejo &&
    Math.floor((hoy.getTime() - masViejo.fecha.getTime()) / MS_POR_DIA);

  return {
    id: "deuda-vieja",
    severity: "attention",
    title: "Deudas envejeciendo",
    body: `${viejos.length} venta${viejos.length > 1 ? "s" : ""} con más de 14 días sin cobrar${dias ? ` (la más vieja: ${dias} días)` : ""}.`,
    action: "Ir a Ventas",
    navigateTo: "ventas",
    score: total,
  };
}

function insightOportunidadSubida(ventas, recetas, hoy = new Date()) {
  const w1 = weekRange(-1, hoy);
  const w2 = weekRange(-2, hoy);
  const u1 = unidadesPorRecetaEnRango(ventas, w1.start, w1.end);
  const u2 = unidadesPorRecetaEnRango(ventas, w2.start, w2.end);

  const subidas = [];
  for (const r of recetas || []) {
    const act = u1.get(r.id) || 0;
    const ant = u2.get(r.id) || 0;
    if (act < 5 || ant <= 0) continue;
    const pct = (act - ant) / ant;
    if (pct >= 0.25) subidas.push({ receta: r, act, ant, pct });
  }
  if (!subidas.length) return null;

  subidas.sort((a, b) => b.pct - a.pct);
  const top = subidas[0];

  return {
    id: "oportunidad-subida",
    severity: "opportunity",
    title: "Producto en alza",
    body: `${top.receta.nombre} vendió ${top.act} unidades la semana pasada (+${pctFmt(top.pct)} vs la anterior). Considerá más stock.`,
    action: "Ver Analytics",
    navigateTo: "analytics",
    score: top.pct * 100,
  };
}

function insightTodoNormal(ventas, hoy = new Date()) {
  const w1 = weekRange(-1, hoy);
  const w2 = weekRange(-2, hoy);
  const u1 = [...unidadesPorRecetaEnRango(ventas, w1.start, w1.end).values()].reduce(
    (s, n) => s + n,
    0,
  );
  const u2 = [...unidadesPorRecetaEnRango(ventas, w2.start, w2.end).values()].reduce(
    (s, n) => s + n,
    0,
  );
  if (u1 === 0 && u2 === 0) return null;

  let body = "No detectamos alertas importantes.";
  if (u2 > 0) {
    const pct = (u1 - u2) / u2;
    if (pct > 0.1) {
      body = `La semana pasada vendiste ${pctFmt(pct)} más que la anterior.`;
    } else if (pct < -0.1) {
      body = `La semana pasada vendiste ${pctFmt(pct)} vs la anterior — conviene mirar Analytics.`;
    }
  }

  return {
    id: "todo-normal",
    severity: "opportunity",
    title: "Todo dentro de lo normal",
    body,
    score: -1,
  };
}

/**
 * Solo insights de stock (sin stock, agotándose). Para rol venta en pantalla Stock.
 * @returns {{ all: Array, hasUrgent: boolean }}
 */
export function buildStockInsights({
  ventas,
  recetas,
  stock,
  hoy = new Date(),
}) {
  const candidatos = [
    ...insightSinStock(recetas, stock),
    ...insightStockAgotandose(ventas, recetas, stock),
  ];

  const all = candidatos.slice().sort((a, b) => {
    const sev = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sev !== 0) return sev;
    return (b.score || 0) - (a.score || 0);
  });

  return { all, hasUrgent: all.some((i) => i.severity === "urgent") };
}

/**
 * @returns {{ all: Array, top: Array, hasUrgent: boolean }}
 */
export function buildInsights({
  ventas,
  recetas,
  clientes,
  recetaIngredientes,
  insumos,
  stock,
  precioHistorial,
  hoy = new Date(),
}) {
  const costoUnitarioPorReceta = costoUnitarioPorRecetaMap(
    recetas || [],
    recetaIngredientes || [],
    insumos || [],
  );

  const subaInsumo = insightSubaInsumo(
    recetas,
    recetaIngredientes,
    insumos,
    costoUnitarioPorReceta,
    precioHistorial,
  );

  const candidatos = [
    insightDeudaVieja(ventas, hoy),
    subaInsumo,
    subaInsumo ? null : insightMargenBajo(recetas, costoUnitarioPorReceta),
    insightCaidaSostenida(ventas, recetas, hoy),
    ...insightSinStock(recetas, stock),
    ...insightStockAgotandose(ventas, recetas, stock),
    ...insightClienteInactivo(ventas, clientes, recetas, hoy),
    ...insightClientesNuevos(ventas, clientes, recetas, hoy),
    insightOportunidadSubida(ventas, recetas, hoy),
  ].filter(Boolean);

  if (!candidatos.length) {
    const ok = insightTodoNormal(ventas, hoy);
    if (ok) candidatos.push(ok);
  }

  const all = candidatos
    .slice()
    .sort((a, b) => {
      const sev = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      if (sev !== 0) return sev;
      return (b.score || 0) - (a.score || 0);
    });

  const top = all.slice(0, INSIGHTS_MAX_VISIBLE);
  const hasUrgent = all.some((i) => i.severity === "urgent");

  return { all, top, hasUrgent };
}
