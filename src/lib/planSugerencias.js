import { unidadesVendidasPorRecetaEnRango } from "./recetasParaVenta";

export const DIAS_CORTO = ["Sáb", "Dom", "Lun", "Mar", "Mié", "Jue", "Vie"];
export const DIAS_LARGO = ["Sábado", "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
export const DIAS_INICIAL = ["S", "D", "L", "M", "X", "J", "V"];
export const NUM_DIAS = 7;

export function crearPorDiaVacios() {
  return Array(NUM_DIAS).fill(0);
}

/** Índice del plan: 0 = sábado … 6 = viernes (alineado con getPlanSemanaInicioISO). */
export function jsDayToPlanIndex(jsDay) {
  return (jsDay + 1) % 7;
}

export function fechaToPlanIndex(fechaISO) {
  const parts = String(fechaISO).slice(0, 10).split("-").map(Number);
  if (parts.length !== 3) return 0;
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  return jsDayToPlanIndex(dt.getDay());
}

export function sumPorDia(porDia) {
  return (porDia || []).reduce((s, n) => s + (Number(n) || 0), 0);
}

export function getSemanaFinISO(semanaInicioISO) {
  const [y, m, d] = String(semanaInicioISO).slice(0, 10).split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + 6);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export function getSemanaAnteriorInicioISO(semanaInicioISO) {
  const [y, m, d] = String(semanaInicioISO).slice(0, 10).split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 7);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

/** Clave legacy (lun–dom) equivalente a una semana sáb–vie. */
export function getPlanSemanaLunesLegacyISO(semanaSabadoISO) {
  const [y, m, d] = String(semanaSabadoISO).slice(0, 10).split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + 2);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export function ventasPorDiaReceta(ventas, semanaInicioISO) {
  const hasta = getSemanaFinISO(semanaInicioISO);
  const map = new Map();
  for (const v of ventas || []) {
    if (v.receta_id == null || !v.fecha) continue;
    const f = String(v.fecha).slice(0, 10);
    if (f < semanaInicioISO || f > hasta) continue;
    const id = String(v.receta_id);
    if (!map.has(id)) map.set(id, crearPorDiaVacios());
    map.get(id)[fechaToPlanIndex(f)] += Number(v.cantidad) || 0;
  }
  return map;
}

export function distribuirUniforme(total) {
  const t = Math.round(Number(total) || 0);
  if (t <= 0) return crearPorDiaVacios();
  const base = Math.floor(t / NUM_DIAS);
  const rest = t % NUM_DIAS;
  return Array(NUM_DIAS).fill(0).map((_, i) => base + (i < rest ? 1 : 0));
}

export function distribuirSegunHistorial(total, historicoPorDia) {
  const t = Math.round(Number(total) || 0);
  if (t <= 0) return crearPorDiaVacios();
  const hist = historicoPorDia || crearPorDiaVacios();
  const sumHist = sumPorDia(hist);
  if (sumHist <= 0) return distribuirUniforme(t);
  const raw = hist.map((h) => (h / sumHist) * t);
  const floors = raw.map((x) => Math.floor(x));
  const remaining = t - sumPorDia(floors);
  const remainders = raw.map((x, i) => ({ i, r: x - floors[i] })).sort((a, b) => b.r - a.r);
  const result = [...floors];
  for (let j = 0; j < remaining; j++) result[remainders[j % remainders.length].i]++;
  return result;
}

export function parsePorDiaFromRow(row) {
  let porDia;
  if (row?.cantidad_por_dia && typeof row.cantidad_por_dia === "object") {
    const hasAny = Object.values(row.cantidad_por_dia).some((v) => Number(v) > 0);
    if (hasAny) {
      porDia = Array(NUM_DIAS).fill(0).map((_, i) => Number(row.cantidad_por_dia[String(i)]) || 0);
    }
  }
  if (!porDia) {
    const total = Number(row?.cantidad_planificada) || 0;
    if (total <= 0) return crearPorDiaVacios();
    porDia = crearPorDiaVacios();
    porDia[0] = total;
  }
  if (row?._legacyId) return remapPorDiaMonFirstToSatFirst(porDia);
  return remapPorDiaLegacySemanaLunes(row?.semana_inicio, porDia);
}

function isSemanaInicioLunes(semanaInicioISO) {
  if (!semanaInicioISO) return false;
  const [y, m, d] = String(semanaInicioISO).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).getDay() === 1;
}

/** Planes guardados con semana_inicio en lunes usaban índice 0 = lun; ahora 0 = sáb. */
export function remapPorDiaMonFirstToSatFirst(porDia) {
  const p = porDia || crearPorDiaVacios();
  return [p[5], p[6], p[0], p[1], p[2], p[3], p[4]];
}

function remapPorDiaLegacySemanaLunes(semanaInicioISO, porDia) {
  if (!isSemanaInicioLunes(semanaInicioISO)) return porDia;
  return remapPorDiaMonFirstToSatFirst(porDia);
}

export function porDiaToJson(porDia) {
  const obj = {};
  for (let i = 0; i < NUM_DIAS; i++) obj[String(i)] = Number(porDia[i]) || 0;
  return obj;
}

export function rescalePorDia(porDia, newTotal) {
  return distribuirSegunHistorial(Math.max(0, Math.round(Number(newTotal) || 0)), porDia);
}

/** Patrón Sáb–Vie sumando ventas de las últimas N semanas (por día de semana). */
export function ventasPatronPorDiaReceta(ventas, recetaId, semanaInicioISO, numSemanas = 4) {
  const patron = crearPorDiaVacios();
  const [y, m, d] = String(semanaInicioISO).slice(0, 10).split("-").map(Number);
  const inicio = new Date(y, m - 1, d);
  inicio.setDate(inicio.getDate() - numSemanas * 7);
  const desdeISO = `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, "0")}-${String(inicio.getDate()).padStart(2, "0")}`;
  const hastaISO = getSemanaFinISO(getSemanaAnteriorInicioISO(semanaInicioISO));
  const id = String(recetaId);
  for (const v of ventas || []) {
    if (String(v.receta_id) !== id || !v.fecha) continue;
    const f = String(v.fecha).slice(0, 10);
    if (f < desdeISO || f > hastaISO) continue;
    patron[fechaToPlanIndex(f)] += Number(v.cantidad) || 0;
  }
  return patron;
}

/** Reparte `total` según patrón histórico de ventas; si no hay patrón, uniforme. */
export function distribuirParaReceta(total, ventas, recetaId, semanaInicioISO) {
  const t = Math.round(Number(total) || 0);
  if (t <= 0) return crearPorDiaVacios();
  const patron = ventasPatronPorDiaReceta(ventas, recetaId, semanaInicioISO);
  return distribuirSegunHistorial(t, patron);
}

export function fechaDiaSemanaLabel(semanaInicioISO, diaIdx) {
  const [y, m, d] = String(semanaInicioISO).slice(0, 10).split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + diaIdx);
  return dt.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "short" });
}

export function cartItemsDesdePlanRows(planRows, recetas) {
  return (planRows || [])
    .map((row) => {
      const receta = (recetas || []).find((r) => r.id === row.receta_id);
      if (!receta) return null;
      const porDia = parsePorDiaFromRow(row).map((n) => Number(n) || 0);
      const cantidad = Number(row.cantidad_planificada) || sumPorDia(porDia);
      if (cantidad <= 0) return null;
      return { receta, cantidad, porDia };
    })
    .filter(Boolean);
}

/** Productos del plan actual con ventas sem. ant. — solo comparación, no copia. */
export function comparacionPlanVsVentas(cartPlanItems, ventas, semanaInicioISO) {
  return (cartPlanItems || [])
    .filter((it) => it.receta && !it.receta.es_precursora)
    .map((it) => {
      const vendido = ventasRecetaSemanaAnterior(ventas, it.receta.id, semanaInicioISO);
      if (vendido <= 0) return null;
      const planificado = it.cantidad || 0;
      return {
        receta: it.receta,
        planificado,
        vendido,
        debajo: planificado < vendido,
        diferencia: vendido - planificado,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.diferencia - a.diferencia);
}

export function sugerenciasDesdeVentasSemanaAnterior(ventas, recetas, semanaInicioISO) {
  const antInicio = getSemanaAnteriorInicioISO(semanaInicioISO);
  const antFin = getSemanaFinISO(antInicio);
  const totales = unidadesVendidasPorRecetaEnRango(ventas, antInicio, antFin);
  return (recetas || [])
    .filter((r) => r && !r.es_precursora && !r.oculto_en_venta)
    .map((r) => {
      const total = totales.get(String(r.id)) || 0;
      if (total <= 0) return null;
      return {
        receta: r,
        cantidad: total,
        porDia: distribuirParaReceta(total, ventas, r.id, semanaInicioISO),
      };
    })
    .filter(Boolean);
}

export function totalVentasProductosSemanaAnterior(ventas, recetas, semanaInicioISO) {
  const antInicio = getSemanaAnteriorInicioISO(semanaInicioISO);
  const antFin = getSemanaFinISO(antInicio);
  const vendibles = new Set(
    (recetas || []).filter((r) => r && !r.es_precursora && !r.oculto_en_venta).map((r) => String(r.id)),
  );
  let total = 0;
  for (const v of ventas || []) {
    if (!v.fecha || v.receta_id == null) continue;
    if (!vendibles.has(String(v.receta_id))) continue;
    const f = String(v.fecha).slice(0, 10);
    if (f >= antInicio && f <= antFin) total += Number(v.cantidad) || 0;
  }
  return total;
}

export function ventasRecetaSemanaAnterior(ventas, recetaId, semanaInicioISO) {
  const antInicio = getSemanaAnteriorInicioISO(semanaInicioISO);
  const antFin = getSemanaFinISO(antInicio);
  return unidadesVendidasPorRecetaEnRango(ventas, antInicio, antFin).get(String(recetaId)) || 0;
}

/** Unidades vendidas de una receta en un día de la semana anterior (mismo Sáb–Vie). */
export function ventasRecetaEnDiaSemanaAnterior(ventas, recetaId, semanaInicioISO, diaIdx) {
  const antInicio = getSemanaAnteriorInicioISO(semanaInicioISO);
  const porDia = ventasPorDiaReceta(ventas, antInicio);
  return (porDia.get(String(recetaId)) || crearPorDiaVacios())[diaIdx] || 0;
}
