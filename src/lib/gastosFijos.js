const parseFecha = (val) => {
  if (!val) return null;
  if (val instanceof Date && !Number.isNaN(val.getTime())) return val;
  const str = String(val);
  const parts = str.split("T")[0].split("-");
  if (parts.length === 3) {
    const [y, m, day] = parts.map((x) => parseInt(x, 10));
    if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(day)) {
      return new Date(y, m - 1, day);
    }
  }
  const dt = new Date(str);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

/**
 * Indica si un gasto fijo estaba vigente en la fecha dada (para cálculos por período).
 * Usa fecha_inicio_vigencia y fecha_fin_vigencia. Si no existen, se considera vigente.
 * Fin de vigencia es exclusivo: si fin = dia, el gasto ya no cuenta ese día (alineado con "Lista de gastos pasados").
 */
function vigenteEnFecha(g, fechaRef) {
  const d =
    fechaRef instanceof Date ? fechaRef : new Date(fechaRef);
  const dia = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const inicio = parseFecha(g.fecha_inicio_vigencia);
  const fin = parseFecha(g.fecha_fin_vigencia);
  if (inicio && inicio.getTime() > dia.getTime()) return false;
  if (fin && fin.getTime() <= dia.getTime()) return false;
  return true;
}

/**
 * Normaliza gastos fijos a valores diarios y semanales.
 * Solo procesa tipo 'fijo' (o sin tipo, para datos viejos).
 * Si se pasa fechaRef, solo se incluyen gastos vigentes en esa fecha (por inicio/fin vigencia).
 * No se usa activo/inactivo: si es pasado, cuenta si estaba vigente en esa fecha.
 * @param {Array} gastos
 * @param {Date} [fechaRef] - Fecha de referencia para filtrar por vigencia; si no se pasa, se usan todos los fijos (sin filtro por vigencia).
 */
export function calcularGastosFijosNormalizados(gastos, fechaRef) {
  let dia = 0;
  let semana = 0;
  for (const g of gastos || []) {
    const tipo = (g.tipo || "fijo").toLowerCase();
    if (tipo !== "fijo") continue;
    if (fechaRef != null && !vigenteEnFecha(g, fechaRef)) continue;
    const monto = Number(g.monto) || 0;
    if (!monto) continue;
    const freq = (g.frecuencia || "").toLowerCase();
    if (freq === "diario") {
      dia += monto;
      semana += monto * 7;
    } else if (freq === "semanal") {
      semana += monto;
      dia += monto / 7;
    } else if (freq === "mensual") {
      const porDia = monto / 30;
      dia += porDia;
      semana += porDia * 7;
    }
  }
  return { dia, semana };
}

const startOfWeek = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfWeek = (start) => {
  const d = new Date(start);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
};

const isBetween = (date, from, to) =>
  date && date.getTime() >= from.getTime() && date.getTime() <= to.getTime();

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

/**
 * Suma el prorrateo diario de gastos fijos vigentes en cada día del rango [desde, hasta].
 * Permite contar gastos que empiezan o terminan a mitad de semana/mes/año.
 */
export function calcularGastosFijosEnRango(gastos, desde, hasta) {
  const from = startOfDay(desde);
  const to = startOfDay(hasta);
  if (from.getTime() > to.getTime()) return 0;

  let total = 0;
  for (let d = new Date(from); d.getTime() <= to.getTime(); d.setDate(d.getDate() + 1)) {
    total += calcularGastosFijosNormalizados(gastos, d).dia;
  }
  return total;
}

function sumarGastosVariablePuntualEnRango(gastos, desde, hasta) {
  let total = 0;
  for (const g of gastos || []) {
    const tipo = (g.tipo || "fijo").toLowerCase();
    if (tipo !== "variable" && tipo !== "puntual") continue;
    const monto = Number(g.monto) || 0;
    if (!monto) continue;
    const fecha = parseFecha(g.fecha);
    if (!fecha) continue;
    if (isBetween(fecha, desde, hasta)) total += monto;
  }
  return total;
}

/**
 * Gastos (fijos prorrateados día a día + variable/puntual) en un rango de fechas.
 */
export function calcularGastosEnPeriodo(gastos, desde, hasta) {
  const fijos = calcularGastosFijosEnRango(gastos, desde, hasta);
  const varPunt = sumarGastosVariablePuntualEnRango(gastos, desde, hasta);
  return { fijos, varPunt, total: fijos + varPunt };
}

const FREQ_LABEL = { diario: "Diario", semanal: "Semanal", mensual: "Mensual" };
const TIPO_LABEL = { fijo: "Fijo", variable: "Variable", puntual: "Puntual" };

const formatFechaCorta = (val) => {
  const d = parseFecha(val);
  if (!d) return "";
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

/**
 * Desglose por ítem de gasto en un período (solo ítems con importe > 0).
 * @returns {Array<{ id, nombre, tipo, tipoLabel, importe, detalle }>}
 */
export function desglosarGastosEnPeriodo(gastos, desde, hasta) {
  const from = startOfDay(desde);
  const to = startOfDay(hasta);
  if (from.getTime() > to.getTime()) return [];

  const rows = [];
  for (const g of gastos || []) {
    const tipo = (g.tipo || "fijo").toLowerCase();
    const monto = Number(g.monto) || 0;
    if (!monto) continue;

    if (tipo === "fijo") {
      let importe = 0;
      let diasActivos = 0;
      for (let d = new Date(from); d.getTime() <= to.getTime(); d.setDate(d.getDate() + 1)) {
        if (!vigenteEnFecha(g, d)) continue;
        importe += calcularGastosFijosNormalizados([g], d).dia;
        diasActivos += 1;
      }
      if (importe <= 0) continue;
      const freq = (g.frecuencia || "mensual").toLowerCase();
      rows.push({
        id: g.id,
        nombre: g.nombre,
        tipo,
        tipoLabel: TIPO_LABEL.fijo,
        importe,
        detalle: `${FREQ_LABEL[freq] || freq} · ${diasActivos} ${
          diasActivos === 1 ? "día" : "días"
        }`,
      });
    } else if (tipo === "variable" || tipo === "puntual") {
      const fecha = parseFecha(g.fecha);
      if (!fecha || !isBetween(fecha, desde, hasta)) continue;
      rows.push({
        id: g.id,
        nombre: g.nombre,
        tipo,
        tipoLabel: TIPO_LABEL[tipo] || tipo,
        importe: monto,
        detalle: formatFechaCorta(g.fecha),
      });
    }
  }

  rows.sort((a, b) => b.importe - a.importe);
  return rows;
}

/**
 * Calcula gastos totales (fijo + variable + puntual) para dia, semana y mes.
 * Fijo: prorrateado por frecuencia, día a día en semana/mes/año según vigencia.
 * Variable/puntual: monto completo si la fecha cae en el período.
 * @param {Array} gastos - Lista de gastos
 * @param {Date} [fechaRef=new Date()] - Fecha de referencia para semana/mes
 * @returns {{ dia: number, semana: number, mes: number, anio: number }}
 */
export function calcularGastosTotales(gastos, fechaRef = new Date()) {
  const ref = fechaRef instanceof Date ? fechaRef : new Date(fechaRef);
  const { dia: diaFijos } = calcularGastosFijosNormalizados(gastos, ref);

  const weekStart = startOfWeek(ref);
  const weekEnd = endOfWeek(weekStart);
  const monthStart = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(
    ref.getFullYear(),
    ref.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );
  const yearStart = new Date(ref.getFullYear(), 0, 1, 0, 0, 0, 0);
  const yearEnd = new Date(ref.getFullYear(), 11, 31, 23, 59, 59, 999);

  const refDay = startOfDay(ref);
  let varPuntDia = 0;
  for (const g of gastos || []) {
    const tipo = (g.tipo || "fijo").toLowerCase();
    if (tipo !== "variable" && tipo !== "puntual") continue;
    const monto = Number(g.monto) || 0;
    if (!monto) continue;
    const fecha = parseFecha(g.fecha);
    if (!fecha) continue;
    const fechaDay = startOfDay(fecha);
    if (fechaDay.getTime() === refDay.getTime()) varPuntDia += monto;
  }

  const semanaFijos = calcularGastosFijosEnRango(gastos, weekStart, weekEnd);
  const mesFijos = calcularGastosFijosEnRango(gastos, monthStart, monthEnd);
  const anioFijos = calcularGastosFijosEnRango(gastos, yearStart, yearEnd);

  const varPuntSemana = sumarGastosVariablePuntualEnRango(gastos, weekStart, weekEnd);
  const varPuntMes = sumarGastosVariablePuntualEnRango(gastos, monthStart, monthEnd);
  const varPuntAnio = sumarGastosVariablePuntualEnRango(gastos, yearStart, yearEnd);

  const semanaAnteriorStart = new Date(weekStart);
  semanaAnteriorStart.setDate(semanaAnteriorStart.getDate() - 7);
  const semanaAnteriorEnd = new Date(weekEnd);
  semanaAnteriorEnd.setDate(semanaAnteriorEnd.getDate() - 7);
  const semanaAnterior = calcularGastosEnPeriodo(
    gastos,
    semanaAnteriorStart,
    semanaAnteriorEnd
  ).total;

  return {
    dia: (diaFijos || 0) + varPuntDia,
    semana: semanaFijos + varPuntSemana,
    mes: mesFijos + varPuntMes,
    anio: anioFijos + varPuntAnio,
    desglose: {
      semanaFijos,
      semanaExtras: varPuntSemana,
      mesFijos,
      mesExtras: varPuntMes,
      semanaAnterior,
    },
  };
}

/** Límites lun–dom de la semana que contiene fechaRef. */
export function getSemanaActualBounds(fechaRef = new Date()) {
  const ref = fechaRef instanceof Date ? fechaRef : new Date(fechaRef);
  const weekStart = startOfWeek(ref);
  return { weekStart, weekEnd: endOfWeek(weekStart) };
}

/** true si la fecha del gasto variable/puntual cae en [weekStart, weekEnd]. */
export function gastoEnSemana(g, weekStart, weekEnd) {
  const tipo = (g.tipo || "fijo").toLowerCase();
  if (tipo !== "variable" && tipo !== "puntual") return false;
  const fecha = parseFecha(g.fecha);
  if (!fecha) return false;
  return isBetween(fecha, weekStart, weekEnd);
}
