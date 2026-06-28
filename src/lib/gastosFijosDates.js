export const parseFecha = (val) => {
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

export const startOfWeek = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const endOfWeek = (start) => {
  const d = new Date(start);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
};

export const isBetween = (date, from, to) =>
  date && date.getTime() >= from.getTime() && date.getTime() <= to.getTime();

export const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

/**
 * Indica si un gasto fijo estaba vigente en la fecha dada (para cálculos por período).
 */
export function vigenteEnFecha(g, fechaRef) {
  const d =
    fechaRef instanceof Date ? fechaRef : new Date(fechaRef);
  const dia = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const inicio = parseFecha(g.fecha_inicio_vigencia);
  const fin = parseFecha(g.fecha_fin_vigencia);
  if (inicio && inicio.getTime() > dia.getTime()) return false;
  if (fin && fin.getTime() <= dia.getTime()) return false;
  return true;
}

export const formatFechaCorta = (val) => {
  const d = parseFecha(val);
  if (!d) return "";
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};
