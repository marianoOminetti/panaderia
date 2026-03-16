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

/**
 * Calcula gastos totales (fijo + variable + puntual) para dia, semana y mes.
 * Fijo: prorrateado por frecuencia.
 * Variable/puntual: monto completo si la fecha cae en el período.
 * @param {Array} gastos - Lista de gastos
 * @param {Date} [fechaRef=new Date()] - Fecha de referencia para semana/mes
 * @returns {{ dia: number, semana: number, mes: number }}
 */
export function calcularGastosTotales(gastos, fechaRef = new Date()) {
  const ref = fechaRef instanceof Date ? fechaRef : new Date(fechaRef);
  const { dia: diaFijos, semana: semanaFijos } =
    calcularGastosFijosNormalizados(gastos, ref);

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

  let varPuntSemana = 0;
  let varPuntMes = 0;
  for (const g of gastos || []) {
    const tipo = (g.tipo || "fijo").toLowerCase();
    if (tipo !== "variable" && tipo !== "puntual") continue;
    const monto = Number(g.monto) || 0;
    if (!monto) continue;
    const fecha = parseFecha(g.fecha);
    if (!fecha) continue;
    if (isBetween(fecha, weekStart, weekEnd)) varPuntSemana += monto;
    if (isBetween(fecha, monthStart, monthEnd)) varPuntMes += monto;
  }

  const totalDiasMes = monthEnd.getDate();
  const mesFijos = (diaFijos || 0) * totalDiasMes;

  return {
    dia: diaFijos || 0,
    semana: (semanaFijos || 0) + varPuntSemana,
    mes: mesFijos + varPuntMes,
  };
}
