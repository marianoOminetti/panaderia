/**
 * Normaliza gastos fijos a valores diarios y semanales.
 * Solo procesa tipo 'fijo' (o sin tipo, para datos viejos).
 * Usado por GastosFijos para retrocompatibilidad.
 */
export function calcularGastosFijosNormalizados(gastos) {
  let dia = 0;
  let semana = 0;
  for (const g of gastos || []) {
    if (g.activo === false) continue;
    const tipo = (g.tipo || "fijo").toLowerCase();
    if (tipo !== "fijo") continue;
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
    calcularGastosFijosNormalizados(gastos);

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
    if (g.activo === false) continue;
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
